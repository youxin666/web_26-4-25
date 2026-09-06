import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const worker = readFileSync(new URL('../blog-worker.js', import.meta.url), 'utf8');
const script = readFileSync(new URL('../blog-public/script.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../blog-public/styles.css', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../migrations/blog_0006_comment_replies.sql', import.meta.url), 'utf8');

assert.match(migration, /ALTER TABLE blog_comments ADD COLUMN parent_id TEXT/);
assert.match(migration, /idx_blog_comments_thread/);
assert.match(worker, /SELECT id, parent_id, user_id, author_name, content, created_at/);
assert.match(worker, /parent\.parent_id/);
assert.match(worker, /article_permalink = \? AND status = 'approved'/);
assert.match(worker, /INSERT INTO blog_comments \(id, article_permalink, user_id, author_name, author_email, content, parent_id/);
assert.match(worker, /data-comment-reply-context/);
assert.match(worker, /name="parentId"/);
assert.match(script, /data-comment-reply=/);
assert.match(script, /comments\.replyingTo/);
assert.match(script, /reply\.parent_id === comment\.id/);
assert.match(styles, /\.blog-comment-replies::before/);
assert.match(styles, /\.blog-comment-card--reply/);

console.log('Blog comment reply checks passed.');
