const dictionary = window.VOC_DICTIONARY;
const byCode = new Map(dictionary.map(entry => [entry['编码'], entry]));
const byLabel = new Map(dictionary.map(entry => [entry['三级标签'], entry]));
const legacyCodes = {
  '毛发处理好':'A103', '地面无水渍':'A202', '地面残留水渍':'A202',
  '机身或水箱漏水':'A304', '漏水':'A304', '自清洁好用':'A401',
  '自清洁效果差':'A401', '烘干效果好':'A402', '烘干不足':'A402',
  '异味或发臭':'A404', '异味':'A404', '续航好':'A501',
  '吸力强':'A601', '吸力不足':'A601', '吸力':'A601',
  '清水箱够用':'A801', '清水箱容量小':'A801', '清水箱':'A801',
  '污水箱容量小或频繁满':'A802', '污水箱':'A802', '运行安静':'A901',
  '噪音大':'A901', '机身重':'B101', '机身轻便':'B101', '机身重量':'B101',
  '使用方便':'B501', '操作不便':'B501', '配件缺失或难买':'D301',
  '性价比高':'G102', '性价比':'G102', '型号对比':'H104'
};
function migrateRecord(record) {
  const unmapped = new Set();
  const result = {...record};
  for (const field of ['positive', 'negative', 'topics']) {
    const names = new Set();
    for (const label of record[field]) {
      const entry = byLabel.get(label) || byCode.get(legacyCodes[label]);
      if (entry) names.add(entry['三级标签']);
      else unmapped.add(label);
    }
    result[field] = [...names];
  }
  result.topics = [...new Set([...result.topics, ...result.positive, ...result.negative])];
  result.unmapped = [...unmapped];
  if (result.unmapped.length && result.dictionaryVersion !== '0.1') result.reviewed = false;
  return result;
}
