/* A small runtime for the game's screens.
   Each page holds its markup in <template id="dc-tpl"> with {{bindings}}, <sc-for> loops and <sc-if> blocks,
   and a `Component` class whose renderVals() returns the values. setState() re-renders and patches the page in place. */
(function () {
  'use strict';

  class DCLogic {
    constructor() { this.state = null; }
    setState(patch) {
      this.state = Object.assign({}, this.state || {}, patch || {});
      DC.schedule();
    }
  }
  window.DCLogic = DCLogic;

  var BIND = /\{\{([\s\S]+?)\}\}/g;
  var ONE = /^\s*\{\{([\s\S]+?)\}\}\s*$/;

  function lookup(expr, scope) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return parseFloat(expr);
    if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\[\d+\])*$/.test(expr)) {
      var parts = expr.replace(/\[(\d+)\]/g, '.$1').split('.');
      var v = scope;
      for (var i = 0; i < parts.length; i++) { if (v === null || v === undefined) return undefined; v = v[parts[i]]; }
      return v;
    }
    try { return new Function('s', 'with (s) { return (' + expr + '); }')(scope); } catch (e) { return undefined; }
  }

  function text(v) { return v === null || v === undefined || v === false ? '' : String(v); }

  function interp(str, scope) {
    var m = str.match(ONE);
    if (m) return lookup(m[1], scope);
    return str.replace(BIND, function (_, e) { return text(lookup(e, scope)); });
  }

  function attach(el, type) {
    el.__bound = el.__bound || {};
    if (el.__bound[type]) return;
    el.__bound[type] = true;
    el.addEventListener(type, function (ev) {
      var f = el.__h && el.__h[type];
      if (typeof f === 'function') {
        if (type === 'wheel') ev.preventDefault();
        f(ev);
      }
    }, { passive: type !== 'wheel' });
  }

  // Build real nodes from template nodes, for one scope.
  function build(tplNodes, scope, out) {
    for (var i = 0; i < tplNodes.length; i++) {
      var n = tplNodes[i];
      if (n.nodeType === 3) {
        var t = n.nodeValue;
        out.push(document.createTextNode(t.indexOf('{{') >= 0 ? text(interp(t, scope)) : t));
      } else if (n.nodeType === 1) {
        var name = n.localName;
        if (name === 'sc-for') {
          var list = lookup((n.getAttribute('list') || '').replace(/^\s*\{\{|\}\}\s*$/g, ''), scope) || [];
          var as = n.getAttribute('as') || 'item';
          for (var k = 0; k < list.length; k++) {
            var sub = Object.create(scope);
            sub[as] = list[k];
            sub[as + 'Index'] = k;
            build(n.childNodes, sub, out);
          }
        } else if (name === 'sc-if') {
          if (lookup((n.getAttribute('value') || '').replace(/^\s*\{\{|\}\}\s*$/g, ''), scope)) build(n.childNodes, scope, out);
        } else {
          var el = n.namespaceURI === 'http://www.w3.org/1999/xhtml' ? document.createElement(n.localName) : document.createElementNS(n.namespaceURI, n.localName);
          for (var a = 0; a < n.attributes.length; a++) {
            var at = n.attributes[a], an = at.name, av = at.value;
            if (an.indexOf('hint-placeholder') === 0) continue;
            if (an.length > 2 && an.slice(0, 2) === 'on' && av.indexOf('{{') >= 0) {
              el.__h = el.__h || {};
              el.__h[an.slice(2).toLowerCase()] = interp(av, scope);
              continue;
            }
            var val = av.indexOf('{{') >= 0 ? interp(av, scope) : av;
            if (val === null || val === undefined || val === false) continue;
            if (at.namespaceURI) el.setAttributeNS(at.namespaceURI, an, String(val));
            else el.setAttribute(an, String(val));
          }
          if (el.__h) for (var ev in el.__h) attach(el, ev);
          var kids = [];
          build((n.content || n).childNodes, scope, kids);
          for (var c = 0; c < kids.length; c++) el.appendChild(kids[c]);
          out.push(el);
        }
      }
    }
    return out;
  }

  // Patch the live DOM to match freshly built nodes, keeping focus, scroll, typed text and running animations.
  function same(a, b) {
    return a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.localName === b.localName && a.namespaceURI === b.namespaceURI));
  }
  function morphNode(old, nu) {
    if (old.nodeType === 3) { if (old.nodeValue !== nu.nodeValue) old.nodeValue = nu.nodeValue; return; }
    var i, at;
    for (i = old.attributes.length - 1; i >= 0; i--) { at = old.attributes[i]; if (!nu.hasAttribute(at.name)) old.removeAttribute(at.name); }
    for (i = 0; i < nu.attributes.length; i++) { at = nu.attributes[i]; if (old.getAttribute(at.name) !== at.value) old.setAttribute(at.name, at.value); }
    old.__h = nu.__h || null;
    if (old.__h) for (var ev in old.__h) attach(old, ev);
    if (old.localName === 'textarea' || old.localName === 'input') return;
    morphChildren(old, Array.prototype.slice.call(nu.childNodes));
  }
  function morphChildren(parent, nodes) {
    var i = 0;
    for (; i < nodes.length; i++) {
      var old = parent.childNodes[i];
      if (!old) parent.appendChild(nodes[i]);
      else if (same(old, nodes[i])) morphNode(old, nodes[i]);
      else parent.replaceChild(nodes[i], old);
    }
    while (parent.childNodes.length > i) parent.removeChild(parent.lastChild);
  }

  var PAGES = {
    'Home': 'index.html', 'Map': 'map.html', 'Travel': 'travel.html', 'Markets': 'markets.html', 'Auctions': 'auctions.html',
    'Business': 'business.html', 'Counting desk': 'counting-desk.html', 'Fleet': 'fleet.html', 'Ventures': 'ventures.html',
    'Politics': 'politics.html', 'War': 'war.html', 'Family': 'family.html', 'Household': 'household.html',
    'World': 'map.html', 'Wealth': 'business.html', 'Power': 'politics.html', 'Letters': 'trade.html'
  };
  var MENU = [
    ['The whole game (guide)', 'guide.html'], ['Home', 'index.html'], ['Map', 'map.html'], ['Travel', 'travel.html'], ['Markets', 'markets.html'],
    ['Auctions', 'auctions.html'], ['Trade: stall, letters, agents', 'trade.html'], ['Deal sealed: the contract', 'contract.html'],
    ['Business', 'business.html'], ['Counting desk', 'counting-desk.html'], ['Fleet', 'fleet.html'], ['Ventures', 'ventures.html'],
    ['Politics', 'politics.html'], ['War', 'war.html'], ['Family', 'family.html'], ['Household', 'household.html'],
    ['Minecraft: item hover text', 'tooltips.html']
  ];

  function wireNav(root) {
    var links = root.querySelectorAll('nav[aria-label="Main"] a, nav[aria-label="Section"] a');
    for (var i = 0; i < links.length; i++) {
      var label = links[i].textContent.trim();
      if (PAGES[label]) links[i].setAttribute('href', PAGES[label]);
    }
  }

  function addMenu() {
    var here = location.pathname.split('/').pop() || 'index.html';
    var box = document.createElement('div');
    box.innerHTML =
      '<button id="dc-menu-btn" aria-expanded="false" aria-controls="dc-menu" style="position:fixed;right:16px;bottom:16px;z-index:9999;min-height:44px;padding:8px 16px;border-radius:999px;border:1px solid rgba(243,210,126,0.5);background:rgba(20,14,9,0.88);color:#F3D27E;font:600 15px Spectral,Georgia,serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.5)">All screens</button>' +
      '<nav id="dc-menu" aria-label="All screens" hidden style="position:fixed;right:16px;bottom:70px;z-index:9999;width:280px;max-height:70vh;overflow:auto;padding:8px;border-radius:12px;background:rgba(20,14,9,0.95);border:1px solid rgba(243,210,126,0.35);box-shadow:0 16px 40px rgba(0,0,0,0.6)">' +
      MENU.map(function (m) {
        var on = m[1] === here;
        return '<a href="' + m[1] + '" style="display:block;padding:9px 12px;border-radius:8px;text-decoration:none;font:15px Spectral,Georgia,serif;' + (on ? 'background:rgba(243,210,126,0.16);color:#FFF6E4' : 'color:#E6DAC2') + '">' + m[0] + '</a>';
      }).join('') + '</nav>';
    document.body.appendChild(box);
    var btn = document.getElementById('dc-menu-btn'), menu = document.getElementById('dc-menu');
    btn.addEventListener('click', function () { var open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); });
  }

  var comp = null, tpl = null, root = null, pending = false;

  function render() {
    pending = false;
    var vals = comp.renderVals() || {};
    var nodes = build(tpl.content.childNodes, vals, []);
    morphChildren(root, nodes);
    wireNav(root);
  }

  var DC = window.DC = {
    schedule: function () {
      if (!comp || pending) return;
      pending = true;
      (window.requestAnimationFrame || setTimeout)(render);
    },
    boot: function (Component) {
      tpl = document.getElementById('dc-tpl');
      root = document.getElementById('dc-root');
      comp = new Component();
      render();
      addMenu();
    }
  };
})();
