import{T as e,Tt as t,Vt as n,W as r,gt as i,ot as a,v as o,w as s,x as c}from"./sfc-demo.js";import{t as l}from"./Index-B-BYvCQq.js";import{t as u}from"./AsamTextarea-BC3p5f2s--Fc0HQ9g.js";import{t as d}from"./_plugin-vue_export-helper-YZJH4OUp.js";var f={class:`example`},p=d(Object.assign({name:`AsamTextareaFormatExample`},{__name:`Demo`,setup(d){let p=i(`seed
line`);function m(e){return String(e).split(`
`).map(e=>`> `+e).join(`
`)}function h(e){return e.split(`
`).map(e=>e.replace(/^> ?/,``)).join(`
`)}return(i,d)=>(r(),c(`div`,f,[e(t(u),{modelValue:p.value,"onUpdate:modelValue":d[0]||=e=>p.value=e,formatter:m,parser:h,rows:3,"aria-label":`格式化多行`},null,8,[`modelValue`]),e(t(l),{onClick:d[1]||=e=>p.value=`server
row`},{default:a(()=>[...d[2]||=[s(`回填两行`,-1)]]),_:1}),o(`output`,null,n(JSON.stringify({value:p.value})),1)]))}}),[[`__scopeId`,`data-v-6ec68bc8`]]);export{p as default};