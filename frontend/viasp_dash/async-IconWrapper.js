(self.webpackChunkviasp_dash=self.webpackChunkviasp_dash||[]).push([[569],{2491:(t,e)=>{e.Z={width:64,height:64,body:'<path fill="currentColor" d="m39.5 61.077l-6.383-8.703c-.257.013-.515.021-.776.021c-5.604 0-10.163-3.589-10.163-8.002V24.958h7.984L16.081 5.75L2 24.958h7.981v19.435c0 4.704 2.327 9.122 6.55 12.449C20.756 60.169 26.369 62 32.341 62c2.472 0 4.882-.313 7.159-.923m-7.809-49.48c5.597 0 10.152 3.583 10.152 7.99v19.478h-7.975L47.935 58.25L62 39.064h-7.975V19.587c0-4.698-2.323-9.112-6.541-12.435C43.264 3.831 37.656 2 31.691 2c-2.483 0-4.904.32-7.191.932l6.371 8.687c.272-.015.545-.022.82-.022"/>'}},2573:(t,e)=>{e.Z={width:24,height:24,body:'<path fill="currentColor" d="M9.31 6.71a.996.996 0 0 0 0 1.41L13.19 12l-3.88 3.88a.996.996 0 1 0 1.41 1.41l4.59-4.59a.996.996 0 0 0 0-1.41L10.72 6.7c-.38-.38-1.02-.38-1.41.01z"/>'}},4918:(t,e)=>{e.Z={width:24,height:24,body:'<path fill="currentColor" d="M5 15q-.425 0-.713-.288T4 14q0-.425.288-.713T5 13h14q.425 0 .713.288T20 14q0 .425-.288.713T19 15H5Zm0-4q-.425 0-.713-.288T4 10q0-.425.288-.713T5 9h14q.425 0 .713.288T20 10q0 .425-.288.713T19 11H5Z"/>'}},3298:(t,e)=>{e.Z={width:24,height:24,body:'<path fill="currentColor" d="m12 13.171l4.95-4.95l1.414 1.415L12 16L5.636 9.636L7.05 8.222l4.95 4.95Z"/>'}},9043:(t,e)=>{e.Z={width:24,height:24,body:'<path fill="currentColor" d="m12 10.586l4.95-4.95l1.415 1.415l-4.95 4.95l4.95 4.95l-1.415 1.414l-4.95-4.95l-4.95 4.95l-1.413-1.415l4.95-4.95l-4.95-4.95L7.05 5.638l4.95 4.95Z"/>'}},31:(t,e)=>{e.Z={width:24,height:24,body:'<path fill="currentColor" d="m18.031 16.617l4.283 4.282l-1.415 1.415l-4.282-4.283A8.96 8.96 0 0 1 11 20c-4.968 0-9-4.032-9-9s4.032-9 9-9s9 4.032 9 9a8.96 8.96 0 0 1-1.969 5.617Zm-2.006-.742A6.977 6.977 0 0 0 18 11c0-3.867-3.133-7-7-7s-7 3.133-7 7s3.133 7 7 7a6.977 6.977 0 0 0 4.875-1.975l.15-.15Z"/>'}},4920:(t,e,n)=>{"use strict";n.r(e),n.d(e,{default:()=>Rt});var o=n(9196),r=n.n(o),i=n(9064),c=n.n(i);const s=/^[a-z0-9]+(-[a-z0-9]+)*$/,a=(t,e,n,o="")=>{const r=t.split(":");if("@"===t.slice(0,1)){if(r.length<2||r.length>3)return null;o=r.shift().slice(1)}if(r.length>3||!r.length)return null;if(r.length>1){const t=r.pop(),n=r.pop(),i={provider:r.length>0?r[0]:o,prefix:n,name:t};return e&&!l(i)?null:i}const i=r[0],c=i.split("-");if(c.length>1){const t={provider:o,prefix:c.shift(),name:c.join("-")};return e&&!l(t)?null:t}if(n&&""===o){const t={provider:o,prefix:"",name:i};return e&&!l(t,n)?null:t}return null},l=(t,e)=>!!t&&!(""!==t.provider&&!t.provider.match(s)||!(e&&""===t.prefix||t.prefix.match(s))||!t.name.match(s)),f=Object.freeze({left:0,top:0,width:16,height:16}),u=Object.freeze({rotate:0,vFlip:!1,hFlip:!1}),d=Object.freeze({...f,...u}),p=Object.freeze({...d,body:"",hidden:!1});function h(t,e){const n=function(t,e){const n={};!t.hFlip!=!e.hFlip&&(n.hFlip=!0),!t.vFlip!=!e.vFlip&&(n.vFlip=!0);const o=((t.rotate||0)+(e.rotate||0))%4;return o&&(n.rotate=o),n}(t,e);for(const o in p)o in u?o in t&&!(o in n)&&(n[o]=u[o]):o in e?n[o]=e[o]:o in t&&(n[o]=t[o]);return n}function g(t,e,n){const o=t.icons,r=t.aliases||Object.create(null);let i={};function c(t){i=h(o[t]||r[t],i)}return c(e),n.forEach(c),h(t,i)}function m(t,e){const n=[];if("object"!=typeof t||"object"!=typeof t.icons)return n;t.not_found instanceof Array&&t.not_found.forEach((t=>{e(t,null),n.push(t)}));const o=function(t,e){const n=t.icons,o=t.aliases||Object.create(null),r=Object.create(null);return Object.keys(n).concat(Object.keys(o)).forEach((function t(e){if(n[e])return r[e]=[];if(!(e in r)){r[e]=null;const n=o[e]&&o[e].parent,i=n&&t(n);i&&(r[e]=[n].concat(i))}return r[e]})),r}(t);for(const r in o){const i=o[r];i&&(e(r,g(t,r,i)),n.push(r))}return n}const b={provider:"",aliases:{},not_found:{},...f};function y(t,e){for(const n in e)if(n in t&&typeof t[n]!=typeof e[n])return!1;return!0}function v(t){if("object"!=typeof t||null===t)return null;const e=t;if("string"!=typeof e.prefix||!t.icons||"object"!=typeof t.icons)return null;if(!y(t,b))return null;const n=e.icons;for(const t in n){const e=n[t];if(!t.match(s)||"string"!=typeof e.body||!y(e,p))return null}const o=e.aliases||Object.create(null);for(const t in o){const e=o[t],r=e.parent;if(!t.match(s)||"string"!=typeof r||!n[r]&&!o[r]||!y(e,p))return null}return e}const x=Object.create(null);function w(t,e){const n=x[t]||(x[t]=Object.create(null));return n[e]||(n[e]=function(t,e){return{provider:t,prefix:e,icons:Object.create(null),missing:new Set}}(t,e))}function j(t,e){return v(e)?m(e,((e,n)=>{n?t.icons[e]=n:t.missing.add(e)})):[]}let k=!1;function _(t){return"boolean"==typeof t&&(k=t),k}const O=Object.freeze({width:null,height:null}),E=Object.freeze({...O,...u}),S=/(-?[0-9.]*[0-9]+[0-9.]*)/g,L=/^-?[0-9.]*[0-9]+[0-9.]*$/g;function T(t,e,n){if(1===e)return t;if(n=n||100,"number"==typeof t)return Math.ceil(t*e*n)/n;if("string"!=typeof t)return t;const o=t.split(S);if(null===o||!o.length)return t;const r=[];let i=o.shift(),c=L.test(i);for(;;){if(c){const t=parseFloat(i);isNaN(t)?r.push(i):r.push(Math.ceil(t*e*n)/n)}else r.push(i);if(i=o.shift(),void 0===i)return r.join("");c=!c}}const C=/\sid="(\S+)"/g,M="IconifyId"+Date.now().toString(16)+(16777216*Math.random()|0).toString(16);let I=0;function F(t,e=M){const n=[];let o;for(;o=C.exec(t);)n.push(o[1]);if(!n.length)return t;const r="suffix"+(16777216*Math.random()|Date.now()).toString(16);return n.forEach((n=>{const o="function"==typeof e?e(n):e+(I++).toString(),i=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");t=t.replace(new RegExp('([#;"])('+i+')([")]|\\.[a-z])',"g"),"$1"+o+r+"$3")})),t=t.replace(new RegExp(r,"g"),"")}const Z=Object.create(null);function D(t){return Z[t]||Z[""]}function z(t){let e;if("string"==typeof t.resources)e=[t.resources];else if(e=t.resources,!(e instanceof Array&&e.length))return null;return{resources:e,path:t.path||"/",maxURL:t.maxURL||500,rotate:t.rotate||750,timeout:t.timeout||5e3,random:!0===t.random,index:t.index||0,dataAfterTimeout:!1!==t.dataAfterTimeout}}const A=Object.create(null),q=["https://api.simplesvg.com","https://api.unisvg.com"],N=[];for(;q.length>0;)1===q.length||Math.random()>.5?N.push(q.shift()):N.push(q.pop());function P(t,e){const n=z(e);return null!==n&&(A[t]=n,!0)}function R(t){return A[t]}A[""]=z({resources:["https://api.iconify.design"].concat(N)});let H=(()=>{let t;try{if(t=fetch,"function"==typeof t)return t}catch(t){}})();const U={prepare:(t,e,n)=>{const o=[],r=function(t,e){const n=R(t);if(!n)return 0;let o;if(n.maxURL){let t=0;n.resources.forEach((e=>{const n=e;t=Math.max(t,n.length)}));const r=e+".json?icons=";o=n.maxURL-t-n.path.length-r.length}else o=0;return o}(t,e),i="icons";let c={type:i,provider:t,prefix:e,icons:[]},s=0;return n.forEach(((n,a)=>{s+=n.length+1,s>=r&&a>0&&(o.push(c),c={type:i,provider:t,prefix:e,icons:[]},s=n.length),c.icons.push(n)})),o.push(c),o},send:(t,e,n)=>{if(!H)return void n("abort",424);let o=function(t){if("string"==typeof t){const e=R(t);if(e)return e.path}return"/"}(e.provider);switch(e.type){case"icons":{const t=e.prefix,n=e.icons.join(",");o+=t+".json?"+new URLSearchParams({icons:n}).toString();break}case"custom":{const t=e.uri;o+="/"===t.slice(0,1)?t.slice(1):t;break}default:return void n("abort",400)}let r=503;H(t+o).then((t=>{const e=t.status;if(200===e)return r=501,t.json();setTimeout((()=>{n(function(t){return 404===t}(e)?"abort":"next",e)}))})).then((t=>{"object"==typeof t&&null!==t?setTimeout((()=>{n("success",t)})):setTimeout((()=>{404===t?n("abort",t):n("next",r)}))})).catch((()=>{n("next",r)}))}};function $(t,e){t.forEach((t=>{const n=t.loaderCallbacks;n&&(t.loaderCallbacks=n.filter((t=>t.id!==e)))}))}let Q=0;var V={resources:[],index:0,timeout:2e3,rotate:750,random:!1,dataAfterTimeout:!1};function J(t){const e={...V,...t};let n=[];function o(){n=n.filter((t=>"pending"===t().status))}return{query:function(t,r,i){const c=function(t,e,n,o){const r=t.resources.length,i=t.random?Math.floor(Math.random()*r):t.index;let c;if(t.random){let e=t.resources.slice(0);for(c=[];e.length>1;){const t=Math.floor(Math.random()*e.length);c.push(e[t]),e=e.slice(0,t).concat(e.slice(t+1))}c=c.concat(e)}else c=t.resources.slice(i).concat(t.resources.slice(0,i));const s=Date.now();let a,l="pending",f=0,u=null,d=[],p=[];function h(){u&&(clearTimeout(u),u=null)}function g(){"pending"===l&&(l="aborted"),h(),d.forEach((t=>{"pending"===t.status&&(t.status="aborted")})),d=[]}function m(t,e){e&&(p=[]),"function"==typeof t&&p.push(t)}function b(){l="failed",p.forEach((t=>{t(void 0,a)}))}function y(){d.forEach((t=>{"pending"===t.status&&(t.status="aborted")})),d=[]}return"function"==typeof o&&p.push(o),setTimeout((function o(){if("pending"!==l)return;h();const r=c.shift();if(void 0===r)return d.length?void(u=setTimeout((()=>{h(),"pending"===l&&(y(),b())}),t.timeout)):void b();const i={status:"pending",resource:r,callback:(e,n)=>{!function(e,n,r){const i="success"!==n;switch(d=d.filter((t=>t!==e)),l){case"pending":break;case"failed":if(i||!t.dataAfterTimeout)return;break;default:return}if("abort"===n)return a=r,void b();if(i)return a=r,void(d.length||(c.length?o():b()));if(h(),y(),!t.random){const n=t.resources.indexOf(e.resource);-1!==n&&n!==t.index&&(t.index=n)}l="completed",p.forEach((t=>{t(r)}))}(i,e,n)}};d.push(i),f++,u=setTimeout(o,t.rotate),n(r,e,i.callback)})),function(){return{startTime:s,payload:e,status:l,queriesSent:f,queriesPending:d.length,subscribe:m,abort:g}}}(e,t,r,((t,e)=>{o(),i&&i(t,e)}));return n.push(c),c},find:function(t){return n.find((e=>t(e)))||null},setIndex:t=>{e.index=t},getIndex:()=>e.index,cleanup:o}}function W(){}const B=Object.create(null);const X="iconify2",G="iconify",K=G+"-count",Y=G+"-version",tt=36e5,et=168;function nt(t,e){try{return t.getItem(e)}catch(t){}}function ot(t,e,n){try{return t.setItem(e,n),!0}catch(t){}}function rt(t,e){try{t.removeItem(e)}catch(t){}}function it(t,e){return ot(t,K,e.toString())}function ct(t){return parseInt(nt(t,K))||0}const st={local:!0,session:!0},at={local:new Set,session:new Set};let lt=!1,ft="undefined"==typeof window?{}:window;function ut(t){const e=t+"Storage";try{if(ft&&ft[e]&&"number"==typeof ft[e].length)return ft[e]}catch(t){}st[t]=!1}function dt(t,e){const n=ut(t);if(!n)return;const o=nt(n,Y);if(o!==X){if(o){const t=ct(n);for(let e=0;e<t;e++)rt(n,G+e.toString())}return ot(n,Y,X),void it(n,0)}const r=Math.floor(Date.now()/tt)-et,i=t=>{const o=G+t.toString(),i=nt(n,o);if("string"==typeof i){try{const n=JSON.parse(i);if("object"==typeof n&&"number"==typeof n.cached&&n.cached>r&&"string"==typeof n.provider&&"object"==typeof n.data&&"string"==typeof n.data.prefix&&e(n,t))return!0}catch(t){}rt(n,o)}};let c=ct(n);for(let e=c-1;e>=0;e--)i(e)||(e===c-1?(c--,it(n,c)):at[t].add(e))}function pt(){if(!lt){lt=!0;for(const t in st)dt(t,(t=>{const e=t.data,n=w(t.provider,e.prefix);if(!j(n,e).length)return!1;const o=e.lastModified||-1;return n.lastModifiedCached=n.lastModifiedCached?Math.min(n.lastModifiedCached,o):o,!0}))}}function ht(){}const gt=(t,e)=>{const n=function(t,e=!0,n=!1){const o=[];return t.forEach((t=>{const r="string"==typeof t?a(t,e,n):t;r&&o.push(r)})),o}(t,!0,_()),o=function(t){const e={loaded:[],missing:[],pending:[]},n=Object.create(null);t.sort(((t,e)=>t.provider!==e.provider?t.provider.localeCompare(e.provider):t.prefix!==e.prefix?t.prefix.localeCompare(e.prefix):t.name.localeCompare(e.name)));let o={provider:"",prefix:"",name:""};return t.forEach((t=>{if(o.name===t.name&&o.prefix===t.prefix&&o.provider===t.provider)return;o=t;const r=t.provider,i=t.prefix,c=t.name,s=n[r]||(n[r]=Object.create(null)),a=s[i]||(s[i]=w(r,i));let l;l=c in a.icons?e.loaded:""===i||a.missing.has(c)?e.missing:e.pending;const f={provider:r,prefix:i,name:c};l.push(f)})),e}(n);if(!o.pending.length){let t=!0;return e&&setTimeout((()=>{t&&e(o.loaded,o.missing,o.pending,ht)})),()=>{t=!1}}const r=Object.create(null),i=[];let c,s;return o.pending.forEach((t=>{const{provider:e,prefix:n}=t;if(n===s&&e===c)return;c=e,s=n,i.push(w(e,n));const o=r[e]||(r[e]=Object.create(null));o[n]||(o[n]=[])})),o.pending.forEach((t=>{const{provider:e,prefix:n,name:o}=t,i=w(e,n),c=i.pendingIcons||(i.pendingIcons=new Set);c.has(o)||(c.add(o),r[e][n].push(o))})),i.forEach((t=>{const{provider:e,prefix:n}=t;r[e][n].length&&function(t,e){t.iconsToLoad?t.iconsToLoad=t.iconsToLoad.concat(e).sort():t.iconsToLoad=e,t.iconsQueueFlag||(t.iconsQueueFlag=!0,setTimeout((()=>{t.iconsQueueFlag=!1;const{provider:e,prefix:n}=t,o=t.iconsToLoad;let r;delete t.iconsToLoad,o&&(r=D(e))&&r.prepare(e,n,o).forEach((n=>{!function(t,e,n){let o,r;if("string"==typeof t){const e=D(t);if(!e)return n(void 0,424),W;r=e.send;const i=function(t){if(!B[t]){const e=R(t);if(!e)return;const n={config:e,redundancy:J(e)};B[t]=n}return B[t]}(t);i&&(o=i.redundancy)}else{const e=z(t);if(e){o=J(e);const n=D(t.resources?t.resources[0]:"");n&&(r=n.send)}}o&&r?o.query(e,r,n)().abort:n(void 0,424)}(e,n,(e=>{if("object"!=typeof e)n.icons.forEach((e=>{t.missing.add(e)}));else try{const n=j(t,e);if(!n.length)return;const o=t.pendingIcons;o&&n.forEach((t=>{o.delete(t)})),function(t,e){function n(n){let o;if(!st[n]||!(o=ut(n)))return;const r=at[n];let i;if(r.size)r.delete(i=Array.from(r).shift());else if(i=ct(o),!it(o,i+1))return;const c={cached:Math.floor(Date.now()/tt),provider:t.provider,data:e};return ot(o,G+i.toString(),JSON.stringify(c))}lt||pt(),e.lastModified&&!function(t,e){const n=t.lastModifiedCached;if(n&&n>=e)return n===e;if(t.lastModifiedCached=e,n)for(const n in st)dt(n,(n=>{const o=n.data;return n.provider!==t.provider||o.prefix!==t.prefix||o.lastModified===e}));return!0}(t,e.lastModified)||Object.keys(e.icons).length&&(e.not_found&&delete(e=Object.assign({},e)).not_found,n("local")||n("session"))}(t,e)}catch(t){console.error(t)}!function(t){t.iconsLoaderFlag||(t.iconsLoaderFlag=!0,setTimeout((()=>{t.iconsLoaderFlag=!1,function(t){t.pendingCallbacksFlag||(t.pendingCallbacksFlag=!0,setTimeout((()=>{t.pendingCallbacksFlag=!1;const e=t.loaderCallbacks?t.loaderCallbacks.slice(0):[];if(!e.length)return;let n=!1;const o=t.provider,r=t.prefix;e.forEach((e=>{const i=e.icons,c=i.pending.length;i.pending=i.pending.filter((e=>{if(e.prefix!==r)return!0;const c=e.name;if(t.icons[c])i.loaded.push({provider:o,prefix:r,name:c});else{if(!t.missing.has(c))return n=!0,!0;i.missing.push({provider:o,prefix:r,name:c})}return!1})),i.pending.length!==c&&(n||$([t],e.id),e.callback(i.loaded.slice(0),i.missing.slice(0),i.pending.slice(0),e.abort))}))})))}(t)})))}(t)}))}))})))}(t,r[e][n])})),e?function(t,e,n){const o=Q++,r=$.bind(null,n,o);if(!e.pending.length)return r;const i={id:o,icons:e,callback:t,abort:r};return n.forEach((t=>{(t.loaderCallbacks||(t.loaderCallbacks=[])).push(i)})),r}(e,o,i):ht},mt=/[\s,]+/;function bt(t,e){e.split(mt).forEach((e=>{switch(e.trim()){case"horizontal":t.hFlip=!0;break;case"vertical":t.vFlip=!0}}))}function yt(t,e=0){const n=t.replace(/^-?[0-9.]*/,"");function o(t){for(;t<0;)t+=4;return t%4}if(""===n){const e=parseInt(t);return isNaN(e)?0:o(e)}if(n!==t){let e=0;switch(n){case"%":e=25;break;case"deg":e=90}if(e){let r=parseFloat(t.slice(0,t.length-n.length));return isNaN(r)?0:(r/=e,r%1==0?o(r):0)}}return e}let vt;function xt(t){return void 0===vt&&function(){try{vt=window.trustedTypes.createPolicy("iconify",{createHTML:t=>t})}catch(t){vt=null}}(),vt?vt.createHTML(t):t}const wt={...E,inline:!1},jt={xmlns:"http://www.w3.org/2000/svg",xmlnsXlink:"http://www.w3.org/1999/xlink","aria-hidden":!0,role:"img"},kt={display:"inline-block"},_t={backgroundColor:"currentColor"},Ot={backgroundColor:"transparent"},Et={Image:"var(--svg)",Repeat:"no-repeat",Size:"100% 100%"},St={WebkitMask:_t,mask:_t,background:Ot};for(const t in St){const e=St[t];for(const n in Et)e[t+n]=Et[n]}const Lt={...wt,inline:!0};function Tt(t){return t+(t.match(/^[-0-9.]+$/)?"px":"")}if(_(!0),Ct=U,Z[""]=Ct,"undefined"!=typeof document&&"undefined"!=typeof window){pt();const t=window;if(void 0!==t.IconifyPreload){const e=t.IconifyPreload,n="Invalid IconifyPreload syntax.";"object"==typeof e&&null!==e&&(e instanceof Array?e:[e]).forEach((t=>{try{("object"!=typeof t||null===t||t instanceof Array||"object"!=typeof t.icons||"string"!=typeof t.prefix||!function(t,e){if("object"!=typeof t)return!1;if("string"!=typeof e&&(e=t.provider||""),k&&!e&&!t.prefix){let e=!1;return v(t)&&(t.prefix="",m(t,((t,n)=>{n&&function(t,e){const n=a(t,!0,k);return!!n&&function(t,e,n){try{if("string"==typeof n.body)return t.icons[e]={...n},!0}catch(t){}return!1}(w(n.provider,n.prefix),n.name,e)}(t,n)&&(e=!0)}))),e}const n=t.prefix;return!!l({provider:e,prefix:n,name:"a"})&&!!j(w(e,n),t)}(t))&&console.error(n)}catch(t){console.error(n)}}))}if(void 0!==t.IconifyProviders){const e=t.IconifyProviders;if("object"==typeof e&&null!==e)for(let t in e){const n="IconifyProviders["+t+"] is invalid.";try{const o=e[t];if("object"!=typeof o||!o||void 0===o.resources)continue;P(t,o)||console.error(n)}catch(t){console.error(n)}}}}var Ct;class Mt extends o.Component{constructor(t){super(t),this.state={icon:null}}_abortLoading(){this._loading&&(this._loading.abort(),this._loading=null)}_setData(t){this.state.icon!==t&&this.setState({icon:t})}_checkIcon(t){const e=this.state,n=this.props.icon;if("object"==typeof n&&null!==n&&"string"==typeof n.body)return this._icon="",this._abortLoading(),void((t||null===e.icon)&&this._setData({data:n}));let o;if("string"!=typeof n||null===(o=a(n,!1,!0)))return this._abortLoading(),void this._setData(null);const r=function(t){const e="string"==typeof t?a(t,!0,k):t;if(e){const t=w(e.provider,e.prefix),n=e.name;return t.icons[n]||(t.missing.has(n)?null:void 0)}}(o);if(r){if(this._icon!==n||null===e.icon){this._abortLoading(),this._icon=n;const t=["iconify"];""!==o.prefix&&t.push("iconify--"+o.prefix),""!==o.provider&&t.push("iconify--"+o.provider),this._setData({data:r,classes:t}),this.props.onLoad&&this.props.onLoad(n)}}else this._loading&&this._loading.name===n||(this._abortLoading(),this._icon="",this._setData(null),null!==r&&(this._loading={name:n,abort:gt([o],this._checkIcon.bind(this,!1))}))}componentDidMount(){this._checkIcon(!1)}componentDidUpdate(t){t.icon!==this.props.icon&&this._checkIcon(!0)}componentWillUnmount(){this._abortLoading()}render(){const t=this.props,e=this.state.icon;if(null===e)return t.children?t.children:o.createElement("span",{});let n=t;return e.classes&&(n={...t,className:("string"==typeof t.className?t.className+" ":"")+e.classes.join(" ")}),((t,e,n,r)=>{const i=n?Lt:wt,c=function(t,e){const n={...t};for(const t in e){const o=e[t],r=typeof o;t in O?(null===o||o&&("string"===r||"number"===r))&&(n[t]=o):r===typeof n[t]&&(n[t]="rotate"===t?o%4:o)}return n}(i,e),s=e.mode||"svg",a={},l=e.style||{},f={..."svg"===s?jt:{},ref:r};for(let t in e){const n=e[t];if(void 0!==n)switch(t){case"icon":case"style":case"children":case"onLoad":case"mode":case"_ref":case"_inline":break;case"inline":case"hFlip":case"vFlip":c[t]=!0===n||"true"===n||1===n;break;case"flip":"string"==typeof n&&bt(c,n);break;case"color":a.color=n;break;case"rotate":"string"==typeof n?c[t]=yt(n):"number"==typeof n&&(c[t]=n);break;case"ariaHidden":case"aria-hidden":!0!==n&&"true"!==n&&delete f["aria-hidden"];break;default:void 0===i[t]&&(f[t]=n)}}const u=function(t,e){const n={...d,...t},o={...E,...e},r={left:n.left,top:n.top,width:n.width,height:n.height};let i=n.body;[n,o].forEach((t=>{const e=[],n=t.hFlip,o=t.vFlip;let c,s=t.rotate;switch(n?o?s+=2:(e.push("translate("+(r.width+r.left).toString()+" "+(0-r.top).toString()+")"),e.push("scale(-1 1)"),r.top=r.left=0):o&&(e.push("translate("+(0-r.left).toString()+" "+(r.height+r.top).toString()+")"),e.push("scale(1 -1)"),r.top=r.left=0),s<0&&(s-=4*Math.floor(s/4)),s%=4,s){case 1:c=r.height/2+r.top,e.unshift("rotate(90 "+c.toString()+" "+c.toString()+")");break;case 2:e.unshift("rotate(180 "+(r.width/2+r.left).toString()+" "+(r.height/2+r.top).toString()+")");break;case 3:c=r.width/2+r.left,e.unshift("rotate(-90 "+c.toString()+" "+c.toString()+")")}s%2==1&&(r.left!==r.top&&(c=r.left,r.left=r.top,r.top=c),r.width!==r.height&&(c=r.width,r.width=r.height,r.height=c)),e.length&&(i='<g transform="'+e.join(" ")+'">'+i+"</g>")}));const c=o.width,s=o.height,a=r.width,l=r.height;let f,u;null===c?(u=null===s?"1em":"auto"===s?l:s,f=T(u,a/l)):(f="auto"===c?a:c,u=null===s?T(f,l/a):"auto"===s?l:s);const p={},h=(t,e)=>{(t=>"unset"===t||"undefined"===t||"none"===t)(e)||(p[t]=e.toString())};return h("width",f),h("height",u),p.viewBox=r.left.toString()+" "+r.top.toString()+" "+a.toString()+" "+l.toString(),{attributes:p,body:i}}(t,c),p=u.attributes;if(c.inline&&(a.verticalAlign="-0.125em"),"svg"===s){f.style={...a,...l},Object.assign(f,p);let t=0,n=e.id;return"string"==typeof n&&(n=n.replace(/-/g,"_")),f.dangerouslySetInnerHTML={__html:xt(F(u.body,n?()=>n+"ID"+t++:"iconifyReact"))},o.createElement("svg",f)}const{body:h,width:g,height:m}=t,b="mask"===s||"bg"!==s&&-1!==h.indexOf("currentColor"),y=function(t,e){let n=-1===t.indexOf("xlink:")?"":' xmlns:xlink="http://www.w3.org/1999/xlink"';for(const t in e)n+=" "+t+'="'+e[t]+'"';return'<svg xmlns="http://www.w3.org/2000/svg"'+n+">"+t+"</svg>"}(h,{...p,width:g+"",height:m+""});var v;return f.style={...a,"--svg":(v=y,'url("'+function(t){return"data:image/svg+xml,"+function(t){return t.replace(/"/g,"'").replace(/%/g,"%25").replace(/#/g,"%23").replace(/</g,"%3C").replace(/>/g,"%3E").replace(/\s+/g," ")}(t)}(v)+'")'),width:Tt(p.width),height:Tt(p.height),...kt,...b?_t:Ot,...l},o.createElement("span",f)})({...d,...e.data},n,t._inline,t._ref)}}const It=o.forwardRef((function(t,e){const n={...t,_ref:e,_inline:!1};return o.createElement(Mt,n)}));o.forwardRef((function(t,e){const n={...t,_ref:e,_inline:!0};return o.createElement(Mt,n)}));var Ft=n(2491),Zt=n(4918),Dt=n(3298),zt=n(9043),At=n(31),qt=n(2573),Nt=["icon"];function Pt(){return Pt=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var o in n)Object.prototype.hasOwnProperty.call(n,o)&&(t[o]=n[o])}return t},Pt.apply(this,arguments)}function Rt(t){var e=t.icon,n=function(t,e){if(null==t)return{};var n,o,r=function(t,e){if(null==t)return{};var n,o,r={},i=Object.keys(t);for(o=0;o<i.length;o++)n=i[o],e.indexOf(n)>=0||(r[n]=t[n]);return r}(t,e);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(t);for(o=0;o<i.length;o++)n=i[o],e.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(t,n)&&(r[n]=t[n])}return r}(t,Nt);return"clockwiseVerticalArrows"===e?r().createElement(It,Pt({icon:Ft.Z},n)):"dragHandleRounded"===e?r().createElement(It,Pt({icon:Zt.Z},n)):"arrowDownDoubleFill"===e?r().createElement(It,Pt({icon:Dt.Z},n)):"search"===e?r().createElement(It,Pt({icon:At.Z},n)):"close"===e?r().createElement(It,Pt({icon:zt.Z},n)):"navigateNext"===e?r().createElement(It,Pt({icon:qt.Z},n)):r().createElement(It,t)}Rt.propTypes={icon:c().string,rest:c().object}}}]);
//# sourceMappingURL=async-IconWrapper.js.map