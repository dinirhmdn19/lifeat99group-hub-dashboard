(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ContentPlan = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  function value(item, key) { return String(item?.[key] ?? '').trim(); }
  function matchesPlatform(item, selected) {
    return !selected || value(item, 'platform').split(',').map(part => part.trim()).includes(selected);
  }
  function inRange(item, field, from, to) {
    const current = value(item, field);
    return (!from || (current && current >= from)) && (!to || (current && current <= to));
  }
  function filterContent(records, filters) {
    return records.filter(item =>
      matchesPlatform(item, filters.platform) &&
      (!filters.pic || value(item, 'pic') === filters.pic) &&
      (!filters.content_format || value(item, 'content_format') === filters.content_format) &&
      (!filters.status || value(item, 'status') === filters.status) &&
      inRange(item, 'publish_date', filters.publish_from, filters.publish_to) &&
      inRange(item, 'deadline', filters.deadline_from, filters.deadline_to)
    );
  }
  function compare(a, b, key) {
    const left = value(a, key), right = value(b, key);
    if (!left && !right) return 0;
    if (!left) return 1;
    if (!right) return -1;
    return key === 'publish_date' || key === 'deadline'
      ? left.localeCompare(right)
      : left.localeCompare(right, undefined, { sensitivity: 'base' });
  }
  function sortContent(records, key, direction) {
    return [...records].sort((a, b) => {
      const left = value(a, key), right = value(b, key);
      if (!left || !right) return compare(a, b, key);
      return compare(a, b, key) * (direction === 'desc' ? -1 : 1);
    });
  }
  return { filterContent, sortContent };
}));
