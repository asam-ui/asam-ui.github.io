import{$ as e,F as t,N as n,O as r,P as i,Pt as a,Tt as o,Xt as s,ht as c,j as l}from"./sfc-demo.js";import{t as u}from"./Index-hH24A5tL.js";import{t as d}from"./AsamTextarea-BC3p5f2s-BOynqLzN.js";import{t as f}from"./_plugin-vue_export-helper-BX9H136A.js";var p={class:`example`},m=f(t({name:`AsamTextareaFormatExample`,__name:`Demo`,setup(t){let f=o(`seed
line`);function m(e){return String(e).split(`
`).map(e=>`> `+e).join(`
`)}function h(e){return e.split(`
`).map(e=>e.replace(/^> ?/,``)).join(`
`)}return(t,o)=>(e(),l(`div`,p,[i(a(d),{modelValue:f.value,"onUpdate:modelValue":o[0]||=e=>f.value=e,formatter:m,parser:h,rows:3,"aria-label":`格式化多行`},null,8,[`modelValue`]),i(a(u),{type:`default`,onClick:o[1]||=e=>f.value=`server
row`},{default:c(()=>[...o[2]||=[n(`回填两行`,-1)]]),_:1}),r(`output`,null,s(JSON.stringify({value:f.value})),1)]))}}),[[`__scopeId`,`data-v-b0516786`]]);export{m as default};