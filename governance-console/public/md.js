/**
 * md.js — 最小 Markdown 渲染器（无依赖、无 DOM 副作用，可在 Node 里单测）
 *
 * 只支持治理文档实际用到的语法：标题 / 段落 / 无序有序列表 / 表格 / 围栏代码 /
 * 引用块 / 分隔线 / 行内代码 / 粗斜体 / 链接。
 *
 * 安全：**先把文本整体转义，再套标签**，因此文档里的原始 HTML 不会被当标记执行。
 * 链接只允许指向白名单前缀内的文档；越界链接渲染成不可点的 deadlink。
 */
(function (root) {
  'use strict';

  const ALLOW_EXACT = new Set(['HANDOFF.md', '.clinerules', 'README.md']);
  const ALLOW_PREFIX = ['.governance/', 'docs/', 'governance-console/'];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function slugify(t) {
    return String(t).trim().toLowerCase()
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/[^\p{L}\p{N} _-]/gu, '')
      .replace(/ /g, '-');
  }

  function resolveDocLink(curRel, raw) {
    const clean = String(raw).replace(/\\/g, '/');
    if (/^[a-z]+:/i.test(clean)) return { external: true, href: clean };
    const dir = curRel && curRel.includes('/') ? curRel.slice(0, curRel.lastIndexOf('/')) : '';
    const parts = (dir ? dir.split('/') : []).concat(clean.split('/'));
    const out = [];
    for (const p of parts) {
      if (p === '' || p === '.') continue;
      if (p === '..') { if (!out.length) return { bad: true, target: clean }; out.pop(); continue; }
      out.push(p);
    }
    const target = out.join('/');
    const allowed = ALLOW_EXACT.has(target) || ALLOW_PREFIX.some((pre) => target.startsWith(pre));
    return allowed ? { doc: target } : { bad: true, target };
  }

  function inlineMd(escaped, curRel) {
    let s = escaped;

    // 行内代码先抽走，避免内部的 * [ ] 被后续规则改写
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return '\u0000C' + (codes.length - 1) + '\u0000'; });

    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    s = s.replace(/\[([^\]]*)\]\(\s*<?([^)\s>]+)>?[^)]*\)/g, (m, text, href) => {
      const r = resolveDocLink(curRel, href);
      if (r.external) return '<a href="' + href + '" target="_blank" rel="noopener">' + text + '</a>';
      if (r.doc) return '<a href="#" class="doclink" data-doc="' + escapeHtml(r.doc) + '">' + text + '</a>';
      return '<span class="deadlink" title="不在可读白名单内：' + escapeHtml(r.target || href) + '">' + text + '</span>';
    });

    s = s.replace(/\u0000C(\d+)\u0000/g, (_, i) => '<code>' + codes[Number(i)] + '</code>');
    return s;
  }

  function mdToHtml(text, curRel) {
    const lines = String(text).split('\n');
    const out = [];
    let i = 0;
    let para = [];

    const flushPara = () => {
      if (!para.length) return;
      out.push('<p>' + inlineMd(para.map(escapeHtml).join('<br>'), curRel) + '</p>');
      para = [];
    };

    while (i < lines.length) {
      const line = lines[i];

      const fence = line.match(/^\s*(```|~~~)(.*)$/);
      if (fence) {
        flushPara();
        const close = fence[1];
        const lang = fence[2].trim();
        const buf = [];
        i++;
        while (i < lines.length && !(new RegExp('^\\s*' + close)).test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push('<pre class="md-code"' + (lang ? ' data-lang="' + escapeHtml(lang) + '"' : '')
          + '><code>' + escapeHtml(buf.join('\n')) + '</code></pre>');
        continue;
      }

      const h = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (h) {
        flushPara();
        const lv = h[1].length;
        out.push('<h' + lv + ' id="' + slugify(h[2]) + '">' + inlineMd(escapeHtml(h[2]), curRel) + '</h' + lv + '>');
        i++;
        continue;
      }

      if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) { flushPara(); out.push('<hr>'); i++; continue; }

      if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
        flushPara();
        const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
        const head = cells(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
        out.push('<div class="md-table-wrap"><table class="md-table"><thead><tr>'
          + head.map((c) => '<th>' + inlineMd(escapeHtml(c), curRel) + '</th>').join('')
          + '</tr></thead><tbody>'
          + rows.map((r) => '<tr>' + r.map((c) => '<td>' + inlineMd(escapeHtml(c), curRel) + '</td>').join('') + '</tr>').join('')
          + '</tbody></table></div>');
        continue;
      }

      if (/^\s*>/.test(line)) {
        flushPara();
        const buf = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) { buf.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
        out.push('<blockquote>' + mdToHtml(buf.join('\n'), curRel) + '</blockquote>');
        continue;
      }

      if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
        flushPara();
        const ordered = /^\s*\d+\.\s+/.test(line);
        const items = [];
        while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*([-*+]|\d+\.)\s+/, ''));
          i++;
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
            items[items.length - 1] += ' ' + lines[i].trim();
            i++;
          }
        }
        const tag = ordered ? 'ol' : 'ul';
        out.push('<' + tag + '>' + items.map((t) => '<li>' + inlineMd(escapeHtml(t), curRel) + '</li>').join('') + '</' + tag + '>');
        continue;
      }

      if (!line.trim()) { flushPara(); i++; continue; }

      para.push(line);
      i++;
    }
    flushPara();
    return out.join('\n');
  }

  root.MD = { mdToHtml, slugify, escapeHtml, resolveDocLink };
})(typeof window !== 'undefined' ? window : globalThis);
