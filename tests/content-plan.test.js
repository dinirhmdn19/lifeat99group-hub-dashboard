const test = require('node:test');
const assert = require('node:assert/strict');

const { filterContent, sortContent } = require('../lib/content-plan');

const records = [
  { content_name: 'Alpha', publish_date: '2026-08-10', deadline: '2026-08-09', platform: 'Instagram, TikTok', pic: 'Agung', content_format: 'Video', status: 'planned' },
  { content_name: 'Beta', publish_date: '2026-08-20', deadline: null, platform: 'LinkedIn', pic: 'Bima', content_format: 'Static', status: 'draft' },
  { content_name: 'Gamma', publish_date: '2026-08-15', deadline: '2026-08-14', platform: 'Instagram', pic: 'Agung', content_format: 'Story', status: 'posted' },
];

test('filters content by multiple fields and date ranges', () => {
  const result = filterContent(records, {
    platform: 'Instagram', pic: 'Agung', content_format: '', status: '',
    publish_from: '2026-08-01', publish_to: '2026-08-16', deadline_from: '', deadline_to: ''
  });
  assert.deepEqual(result.map(item => item.content_name), ['Alpha', 'Gamma']);
});

test('sorts dates chronologically and reverses direction', () => {
  assert.deepEqual(sortContent(records, 'publish_date', 'asc').map(item => item.content_name), ['Alpha', 'Gamma', 'Beta']);
  assert.deepEqual(sortContent(records, 'publish_date', 'desc').map(item => item.content_name), ['Beta', 'Gamma', 'Alpha']);
});

test('sorts missing values consistently after populated values', () => {
  assert.deepEqual(sortContent(records, 'deadline', 'asc').map(item => item.content_name), ['Alpha', 'Gamma', 'Beta']);
  assert.deepEqual(sortContent(records, 'deadline', 'desc').map(item => item.content_name), ['Gamma', 'Alpha', 'Beta']);
});
