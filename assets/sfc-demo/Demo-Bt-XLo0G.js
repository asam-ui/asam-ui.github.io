import{C as e,Ct as t,H as n,S as r,_ as i,b as a,it as o,mt as s,zt as c}from"./vue.esm-bundler-5NdF0u5k.js";import{t as l}from"./Index-FzXQ4_vV.js";import{t as u}from"./AsamTextarea-BC3p5f2s-DB0aGBRd.js";import{t as d}from"./_plugin-vue_export-helper-LAflW70I.js";var f={class:`example`},p=d(Object.assign({name:`AsamTextareaFormatExample`},{__name:`Demo`,setup(d){let p=s(`seed
line`);function m(e){return String(e).split(`
`).map(e=>`> `+e).join(`
`)}function h(e){return e.split(`
`).map(e=>e.replace(/^> ?/,``)).join(`
`)}return(s,d)=>(n(),a(`div`,f,[e(t(u),{modelValue:p.value,"onUpdate:modelValue":d[0]||=e=>p.value=e,formatter:m,parser:h,rows:3,"aria-label":`格式化多行`},null,8,[`modelValue`]),e(t(l),{type:`primary`,onClick:d[1]||=e=>p.value=`server
row`},{default:o(()=>[...d[2]||=[r(`回填两行`,-1)]]),_:1}),i(`output`,null,c(JSON.stringify({value:p.value})),1)]))}}),[[`__scopeId`,`data-v-9fc5ad5f`]]);export{p as default};