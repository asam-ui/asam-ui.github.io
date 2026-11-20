import{C as e,Ct as t,H as n,S as r,_ as i,b as a,it as o,mt as s,w as c,zt as l}from"./vue.esm-bundler-5NdF0u5k.js";import{t as u}from"./Index-BnlQOjsD.js";import{t as d}from"./AsamTextarea-zF5BB9an-CUvkONYu.js";import{t as f}from"./_plugin-vue_export-helper-kUdvK6Ti.js";var p={class:`example`},m=f(c({name:`AsamTextareaFormatExample`,__name:`Demo`,setup(c){let f=s(`seed
line`);function m(e){return String(e).split(`
`).map(e=>`> `+e).join(`
`)}function h(e){return e.split(`
`).map(e=>e.replace(/^> ?/,``)).join(`
`)}return(s,c)=>(n(),a(`div`,p,[e(t(d),{modelValue:f.value,"onUpdate:modelValue":c[0]||=e=>f.value=e,formatter:m,parser:h,rows:3,"aria-label":`格式化多行`},null,8,[`modelValue`]),e(t(u),{type:`primary`,onClick:c[1]||=e=>f.value=`server
row`},{default:o(()=>[...c[2]||=[r(`回填两行`,-1)]]),_:1}),i(`output`,null,l(JSON.stringify({value:f.value})),1)]))}}),[[`__scopeId`,`data-v-f867bf39`]]);export{m as default};