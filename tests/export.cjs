'use strict';
const assert=require('node:assert/strict');
const M=require('../refund-model.js');
const E=require('../refund-export.js');
const ExcelJS=require('../vendor/exceljs-4.4.0.min.js');
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
const data=M.createData(),state={basis:'pay',period:'seven',type:'all',metric:'amount',productType:'all',reasonType:'all',sort:'amount',productDirection:'desc',reasonSort:'amount',reasonDirection:'desc',...M.defaults()};
const report=E.buildReport(data,state),[core,products,reasons]=report.sheets;
(async()=>{
  await test('three ordered sheets reconcile with current card totals and comparisons',()=>{
    assert.deepEqual(report.sheets.map(s=>s.name),['核心数据','退款商品','退款原因']);
    const period=M.getPeriod(state),cur=M.query(data,state),prev=M.query(data,state,period.previous),expected=M.summarize(cur),last=M.summarize(prev);
    assert.deepEqual(core.rows.map(row=>[row.type,row.amount,row.count]),[
      ['全部 退款',50390.37,193],['发货前 退款',34816.56,121],['未收货 退款',3627.89,23],['已收货 退货退款',11945.92,49]
    ]);
    assert.equal(core.rows[0].amountCompare,M.change(expected.amount,last.amount).value);
    assert.equal(core.rows[3].amountCompare,(1194592-4204438)/4204438);
    assert.equal(core.rows[3].countCompare,(49-155)/155);
    assert.equal(products.rows.reduce((s,row)=>s+Math.round(row.amount*100),0),expected.amount);
    assert(reasons.metadata.some(text=>text.includes('不可重复相加')));
  });
  await test('refund-time headers omit both rates, and product paid metrics remain',()=>{
    const result=E.buildReport(data,{...state,basis:'refund',metric:'rate'});
    for(const sheet of result.sheets)assert(!sheet.columns.some(col=>/退款率/.test(col.label)));
    assert(result.sheets[1].columns.some(col=>col.key==='paidAmount'));
    assert(result.sheets[1].columns.some(col=>col.key==='paid'));
    assert.equal(result.sheets[0].trend.columns[1].key,'amount');
  });
  await test('product and reason local filters stay independent of core and each other',()=>{
    const result=E.buildReport(data,{...state,productType:'mid',reasonType:'return',productSearch:'K1057'});
    assert.deepEqual(result.sheets[0].rows,core.rows);
    assert.equal(result.sheets[1].rows.length,1);assert.equal(result.sheets[1].rows[0].code,'K1057-服饰');
    const cur=M.query(data,state),product=M.summarizeProducts({...cur,refunds:cur.refunds.filter(r=>r.product==='p1'),payments:cur.payments.filter(r=>r.product==='p1')},'mid')[0];
    assert.equal(result.sheets[1].rows[0].paid,product.paid);assert.equal(result.sheets[1].rows[0].amountRate,product.amountRate);
    const expected=M.summarizeReasonHierarchy({...cur,refunds:M.typeRows(cur.refunds,'return')});
    assert.equal(result.sheets[2].rows.filter(r=>!r.detail).reduce((s,r)=>s+Math.round(r.amount*100),0),expected.reduce((s,r)=>s+r.amount,0));
  });
  await test('global category and channel scopes apply to all sheets',()=>{
    const narrowed={...state,category:'牛仔裤',channel:'现货'},result=E.buildReport(data,narrowed),cur=M.query(data,narrowed);
    assert.equal(result.sheets[0].rows[0].amount,M.summarize(cur).amount/100);
    assert.equal(result.sheets[1].rows.length,1);assert.equal(result.sheets[1].rows[0].spu,'1000398390');
    assert(result.sheets.every(sheet=>sheet.metadata.some(text=>text.includes('牛仔裤')&&text.includes('现货'))));
  });
  await test('all 27 products export without TOP20 or pagination caps, identifiers stay strings',()=>{
    const catalog=Array.from({length:27},(_,i)=>({id:'x'+i,name:i===26?'=1+1':'退款商品'+i,code:'000'+i,spu:'1000000000000000'+i}));
    const payments=catalog.map((p,i)=>({product:p.id,subOrderId:'O'+i,sku:'M',skuId:'S'+i,amount:10000+i,payDate:'2026-10-27',payTime:'2026-10-27 10:00:00'}));
    const refunds=payments.map((p,i)=>({...p,refundId:'R'+i,status:'success',type:'mid',reason:'选错SKU',refundDate:'2026-10-28',refundTime:'2026-10-28 11:00:00'}));
    const result=E.buildReport({catalog,payments,refunds,cutoff:M.CUTOFF},state);
    assert.equal(result.sheets[1].rows.length,27);assert.equal(new Set(result.sheets[1].rows.map(r=>r.spu)).size,27);
    assert(result.sheets[1].rows.every(r=>typeof r.spu==='string'&&r.code.startsWith('000')));
    const wb=E.createWorkbook(result,ExcelJS);assert.equal(wb.getWorksheet('退款商品').getCell('A8').value,'=1+1');
  });
  await test('all primary and secondary reasons export even when collapsed, parent orders deduplicate',()=>{
    const cur=M.query(data,state),hierarchy=M.summarizeReasonHierarchy(cur);
    assert.equal(reasons.rows.length,hierarchy.length+hierarchy.reduce((sum,parent)=>sum+parent.children.length,0));
    for(const parent of hierarchy){const row=reasons.rows.find(row=>row.primary===parent.reason&&!row.detail);assert.equal(row.count,parent.count);assert.equal(row.amount,parent.amount/100);}
    assert(products.rows.some(row=>row.reasons.includes('；')));
    assert(products.rows.every(row=>!row.reasons.includes('…')));
  });
  await test('current-only trend uses actual dates, while realtime future hours remain blank',()=>{
    assert.equal(core.trend.rows[0].date,'2026-10-26');assert.equal(core.trend.rows.length,7);
    const today=E.buildReport(data,{...state,period:'today'}).sheets[0];
    assert(today.columns.some(col=>col.label==='昨日全天退款金额'));
    assert.equal(today.trend.rows.length,24);assert.equal(today.trend.rows[15].amount,null);
    assert(today.trend.rows.every(row=>row.date.startsWith(M.DAY)));
  });
  await test('all date modes and four pay metrics produce the selected current trend only',()=>{
    for(const period of ['today','one','seven','thirty','day','week','month','custom'])for(const metric of ['amount','count','amountRate','rate']){
      const s={...state,period,metric,customStart:'2026-10-01',customEnd:'2026-10-02'},r=E.buildReport(data,s),dates=M.getPeriod(s).current;
      assert(r.filename.endsWith(`${dates.start}_${dates.end}.xlsx`));assert.equal(r.sheets[0].trend.columns[1].key,metric);
      assert(r.sheets[0].trend.rows.every(row=>row.date.slice(0,10)>=dates.start&&row.date.slice(0,10)<=dates.end));
    }
  });
  await test('empty results retain three valid sheets and headers without invented rates',async()=>{
    const result=E.buildReport(data,{...state,channel:'预售'}),book=E.createWorkbook(result,ExcelJS);
    assert.equal(result.sheets[0].rows[0].amount,0);assert.equal(result.sheets[0].rows[0].rate,null);
    assert.equal(result.sheets[1].rows.length,0);assert.equal(result.sheets[2].rows.length,0);
    const read=new ExcelJS.Workbook();await read.xlsx.load(await book.xlsx.writeBuffer());
    assert.equal(read.worksheets.length,3);assert.equal(read.getWorksheet('退款商品').getCell('A7').value,'商品名称');
  });
  await test('XLSX roundtrip preserves typed currency, percentages, counts, IDs, frozen headers and filters',async()=>{
    const book=E.createWorkbook(report,ExcelJS),buffer=await book.xlsx.writeBuffer();assert.equal(buffer[0],0x50);assert.equal(buffer[1],0x4b);
    const read=new ExcelJS.Workbook();await read.xlsx.load(buffer);
    const a=read.getWorksheet('核心数据'),b=read.getWorksheet('退款商品');
    assert.equal(a.getCell('C8').value,50390.37);assert.equal(a.getCell('C8').numFmt,'"¥"#,##0.00');
    assert.equal(a.getCell('B8').value,1);assert.equal(a.getCell('B8').numFmt,'0.00%');
    assert.equal(a.getCell('E8').value,193);assert.equal(typeof b.getCell('C8').value,'string');
    assert.equal(a.getCell('A11').value,'已收货 退货退款');assert.equal(a.getCell('C11').value,11945.92);assert.equal(a.getCell('E11').value,49);
    assert.equal(a.views[0].ySplit,7);assert.equal(a.autoFilter,'A7:J11');
    assert.match(a.getCell('A13').value,/^数据趋势/);
    assert.equal(b.rowCount,7+products.rows.length);
  });
  console.log(`\n${passed}/${passed} XLSX export checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
