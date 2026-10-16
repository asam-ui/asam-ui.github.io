import{$ as e,N as t,O as n,P as r,Pt as i,Tt as a,Xt as o,ht as s,j as c}from"./sfc-demo.js";import{t as l}from"./Index-hH24A5tL.js";import{t as u}from"./AsamTextarea-BC3p5f2s-BOynqLzN.js";import{t as d}from"./_plugin-vue_export-helper-BX9H136A.js";var f={class:`example`},p=d(Object.assign({name:`AsamTextareaFormatExample`},{__name:`Demo`,setup(d){let p=a(`seed
line`);function m(e){return String(e).split(`
`).map(e=>`> `+e).join(`
`)}function h(e){return e.split(`
`).map(e=>e.replace(/^> ?/,``)).join(`
`)}return(a,d)=>(e(),c(`div`,f,[r(i(u),{modelValue:p.value,"onUpdate:modelValue":d[0]||=e=>p.value=e,formatter:m,parser:h,rows:3,"aria-label":`格式化多行`},null,8,[`modelValue`]),r(i(l),{type:`default`,onClick:d[1]||=e=>p.value=`server
row`},{default:s(()=>[...d[2]||=[t(`回填两行`,-1)]]),_:1}),n(`output`,null,o(JSON.stringify({value:p.value})),1)]))}}),[[`__scopeId`,`data-v-1170bdf0`]]);export{p as default};