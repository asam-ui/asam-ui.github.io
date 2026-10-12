import{E as e,T as t,Tt as n,Vt as r,W as i,gt as a,ot as o,v as s,w as c,x as l}from"./sfc-demo.js";import{t as u}from"./Index-B-BYvCQq.js";import{t as d}from"./AsamTextarea-BC3p5f2s--Fc0HQ9g.js";import{t as f}from"./_plugin-vue_export-helper-YZJH4OUp.js";var p={class:`example`},m=f(e({name:`AsamTextareaFormatExample`,__name:`Demo`,setup(e){let f=a(`seed
line`);function m(e){return String(e).split(`
`).map(e=>`> `+e).join(`
`)}function h(e){return e.split(`
`).map(e=>e.replace(/^> ?/,``)).join(`
`)}return(e,a)=>(i(),l(`div`,p,[t(n(d),{modelValue:f.value,"onUpdate:modelValue":a[0]||=e=>f.value=e,formatter:m,parser:h,rows:3,"aria-label":`格式化多行`},null,8,[`modelValue`]),t(n(u),{onClick:a[1]||=e=>f.value=`server
row`},{default:o(()=>[...a[2]||=[c(`回填两行`,-1)]]),_:1}),s(`output`,null,r(JSON.stringify({value:f.value})),1)]))}}),[[`__scopeId`,`data-v-4813fe5d`]]);export{m as default};