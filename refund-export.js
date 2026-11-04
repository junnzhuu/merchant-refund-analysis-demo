(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./refund-model.js') : root.RefundModel);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RefundExport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (M) {
  'use strict';
  const TYPES = ['all', ...M.REFUND_TYPES];
  const typeName = type => M.REFUND_TYPE_LABELS[type];
  const labels = {amount:'退款金额', count:'退款订单数', amountRate:'金额退款率', rate:'订单退款率', paidAmount:'用户支付金额', paid:'支付订单数'};
  const formats = {text:'@', amount:'"¥"#,##0.00', count:'#,##0', rate:'0.00%'};
  const column = (key, label, kind='text', width=18) => ({key, label, kind, width});
  const metricColumn = metric => column(metric, labels[metric], ['amount','paidAmount'].includes(metric)?'amount':['rate','amountRate'].includes(metric)?'rate':'count');
  const metricValue = (row, metric) => ['amount','paidAmount'].includes(metric)?row[metric]/100:row[metric];
  const numericSort = (rows, key, direction='desc') => rows.sort((a,b) => a[key]===null?(b[key]===null?0:1):b[key]===null?-1:(a[key]-b[key])*(direction==='asc'?1:-1));

  // Build from the full model result, never from paginated or TOP20 DOM rows.
  function buildReport(data, state, queries) {
    const period = M.getPeriod(state), current = queries?.current || M.query(data,state,period.current), previous = queries?.previous || M.query(data,state,period.previous);
    const pay = state.basis==='pay', items = data.catalog || M.catalog;
    const common = [
      `统计口径：${pay?'按支付时间口径':'按退款时间口径'}    统计时间：${period.current.start} 至 ${period.current.end}`,
      `品牌：${state.brand || '全部品牌'}    类目：${state.category || '全部类目'}    出价渠道：${state.channel || '全部出价渠道'}`,
      `数据截至：${current.cutoff}；${pay?'各订单支付后30天内成功退款，未满30天的数据持续更新':'按所选周期内退款成功时间统计'}`
    ];
    const metadata = (scope, note) => [...common, scope, note];
    const metrics = pay?['amount','count','amountRate','rate']:['amount','count'];
    const coreColumns = [column('type','退款类型','text',24),column('share','金额占比','rate')];
    metrics.forEach(metric => {
      coreColumns.push(metricColumn(metric));
      coreColumns.push(column(metric+'Compare',period.realtime?'昨日全天'+labels[metric]:labels[metric]+'较上周期',period.realtime?metricColumn(metric).kind:'rate',24));
    });
    const allAmount = M.summarize(current).amount;
    const coreRows = TYPES.map(type => {
      const c=M.summarize(current,type), p=M.summarize(previous,type), row={type:typeName(type),share:allAmount?c.amount/allAmount:null};
      metrics.forEach(metric => {
        row[metric]=metricValue(c,metric);
        row[metric+'Compare']=period.realtime?(previous.complete?metricValue(p,metric):null):M.change(c[metric],p[metric],current.complete&&previous.complete).value;
      });
      return row;
    });
    const trendMetric = pay || !['rate','amountRate'].includes(state.metric)?state.metric || 'amount':'amount';
    const trendState = {...state,metric:trendMetric}, series = M.buildTrend(data,trendState,{current,previous});
    const core = {
      name:'核心数据', columns:coreColumns, rows:coreRows,
      metadata:metadata('退款范围：全部 退款及四类退款分别汇总；已收货 退款指无需退货的退款',`卡片对比：${period.previous.start} 至 ${period.previous.end}${period.realtime?'（昨日全天）':''}；金额单位：元；示例数据`),
      trend:{title:`数据趋势 · ${typeName(state.type || 'all')} · ${labels[trendMetric]}`, columns:[column('date',period.realtime?'日期 / 小时':'日期','text',25),metricColumn(trendMetric)], rows:series.currentDates.map((date,i)=>({date,[trendMetric]:series.current[i]}))}
    };

    const search=(state.productSearch || '').trim(), productType=state.productType || 'all';
    const productResult=search?{...current,refunds:current.refunds.filter(row=>M.matches(row,{search},items)),payments:current.payments.filter(row=>M.matches(row,{search},items))}:current;
    const productMetrics=pay?['amountRate','rate','amount','paidAmount','count','paid']:['amount','paidAmount','count','paid'];
    const productSort=productMetrics.includes(state.sort)?state.sort:'amount';
    const products=numericSort(M.summarizeProducts(productResult,productType),productSort,state.productDirection);
    const productRows=products.map(row=>{
      const product=items.find(item=>item.id===row.product), output={name:product.name,code:String(product.code),spu:String(product.spu)};
      productMetrics.forEach(metric=>output[metric]=metricValue(row,metric));
      output.reasons=row.reasons.map(reason=>`${reason.reason}（${reason.amountShare===null?'—':(reason.amountShare*100).toFixed(2)+'%'}）`).join('；');
      return output;
    });
    const productSheet={
      name:'退款商品', columns:[column('name','商品名称','text',44),column('code','货号','text',22),column('spu','SPU','text',20),...productMetrics.map(metricColumn),column('reasons','退款原因','text',64)],rows:productRows,
      metadata:metadata(`退款类型：${typeName(productType)}    商品搜索：${search || '全部商品'}`,`导出全部 ${products.length} 个退款商品，不受TOP20及分页限制；每行一个SPU；退款原因按该商品退款金额占比展示；示例数据`)
    };

    const reasonType=state.reasonType || 'all', reasonMetrics=pay?['amountRate','rate','amount','count']:['amount','count'];
    const reasonSort=reasonMetrics.includes(state.reasonSort)?state.reasonSort:'amount';
    const hierarchy=numericSort(M.summarizeReasonHierarchy({...current,refunds:M.typeRows(current.refunds,reasonType)}),reasonSort,state.reasonDirection);
    const reasonRows=[];
    for (const parent of hierarchy) {
      const summary={primary:parent.reason,secondary:'合计'};
      reasonMetrics.forEach(metric=>summary[metric]=metricValue(parent,metric));
      reasonRows.push(summary);
      for (const child of numericSort(parent.children,reasonSort,state.reasonDirection)) {
        const row={primary:parent.reason,secondary:child.reason,detail:true};
        reasonMetrics.forEach(metric=>row[metric]=metricValue(child,metric));
        reasonRows.push(row);
      }
    }
    const reasonSheet={
      name:'退款原因',columns:[column('primary','一级原因','text',20),column('secondary','二级原因','text',32),...reasonMetrics.map(metricColumn)],rows:reasonRows,
      metadata:metadata(`退款类型：${typeName(reasonType)}；导出全部一级原因及所属二级原因，不受页面展开状态限制`,'“合计”行为一级原因汇总，与二级原因明细不可重复相加；订单数按子订单去重；金额单位：元；示例数据')
    };
    return {filename:`退款分析明细_${pay?'支付时间':'退款时间'}_${period.current.start}_${period.current.end}.xlsx`, sheets:[core,productSheet,reasonSheet]};
  }

  function createWorkbook(report, ExcelJS) {
    const book=new ExcelJS.Workbook();
    book.creator='得物商家后台';
    function styleHeader(row) {
      row.height=38;
      row.eachCell(cell=>{cell.font={name:'Microsoft YaHei',size:11,bold:true,color:{argb:'FF24252B'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE6F7F7'}};cell.alignment={vertical:'middle',wrapText:true};});
    }
    function writeRows(sheet, columns, rows, start, futureBlank=false) {
      rows.forEach((item,i)=>{
        const row=sheet.getRow(start+i);
        columns.forEach((col,j)=>{
          const value=item[col.key], cell=row.getCell(j+1);
          cell.value=value===null||value===undefined?(futureBlank?null:'—'):value;
          cell.numFmt=formats[col.kind];
          cell.font={name:'Microsoft YaHei',size:11,color:{argb:'FF24252B'},bold:sheet.name==='退款原因'&&!item.detail};
          cell.alignment={vertical:'middle',wrapText:col.kind==='text',horizontal:col.kind==='text'?'left':'right'};
          if(i%2===1)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7F8FA'}};
        });
        // Reasons stay complete, including long multi-reason lists.
        const lines=columns.filter(col=>col.kind==='text').map(col=>Math.ceil(String(item[col.key] || '').length*1.8/col.width));
        row.height=Math.max(28,...lines.map(n=>n*17+8));
        if(item.detail)row.getCell(2).alignment={vertical:'middle',wrapText:true,indent:1};
      });
    }
    for(const table of report.sheets) {
      const sheet=book.addWorksheet(table.name), width=table.columns.length;
      sheet.columns=table.columns.map(col=>({key:col.key,width:col.width}));
      sheet.mergeCells(1,1,1,width);
      const title=sheet.getCell(1,1);title.value=table.name;title.font={name:'Microsoft YaHei',size:18,bold:true,color:{argb:'FF24252B'}};title.alignment={vertical:'middle'};sheet.getRow(1).height=36;
      table.metadata.forEach((text,i)=>{
        const n=i+2;sheet.mergeCells(n,1,n,width);const cell=sheet.getCell(n,1);cell.value=text;cell.font={name:'Microsoft YaHei',size:10,color:{argb:'FF626573'}};cell.alignment={vertical:'middle',wrapText:true};sheet.getRow(n).height=28;
      });
      const headerRow=7;
      sheet.getRow(headerRow).values=table.columns.map(col=>col.label);styleHeader(sheet.getRow(headerRow));
      writeRows(sheet,table.columns,table.rows,headerRow+1);
      sheet.autoFilter={from:{row:headerRow,column:1},to:{row:headerRow+table.rows.length,column:width}};
      sheet.views=[{state:'frozen',ySplit:headerRow,xSplit:1}];
      if(table.trend) {
        const start=headerRow+table.rows.length+2;
        sheet.mergeCells(start,1,start,width);sheet.getCell(start,1).value=table.trend.title;sheet.getCell(start,1).font={name:'Microsoft YaHei',size:12,bold:true};sheet.getRow(start).height=30;
        sheet.getRow(start+1).values=table.trend.columns.map(col=>col.label);styleHeader(sheet.getRow(start+1));
        writeRows(sheet,table.trend.columns,table.trend.rows,start+2,true);
      }
    }
    return book;
  }
  return {buildReport,createWorkbook};
});
