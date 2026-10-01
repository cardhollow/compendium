const renderBlueprint=[
{
syntax:/<flashcards\b([^>]*)\/>/gi,
styling:`
.knowledge-flashcards{width:min(430px,100%);margin:18px 0}.knowledge-flashcard{border:1px solid #494943;border-radius:9px;background:#292929;min-height:190px;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;cursor:pointer;user-select:none}.knowledge-flashcard:hover{border-color:#666}.knowledge-flash-side{font-size:18px;line-height:1.45}.knowledge-flash-answer{display:none;color:#e4ca4e}.knowledge-flashcard.flipped .knowledge-flash-question{display:none}.knowledge-flashcard.flipped .knowledge-flash-answer{display:block}.knowledge-flash-controls{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}.knowledge-flash-button{height:32px;padding:0 12px;border:1px solid #444;background:#292929;color:#bbb;border-radius:6px;cursor:pointer}.knowledge-flash-button:hover{background:#343434;color:#eee}.knowledge-flash-count{font-size:11px;color:#777}
`,
content:(syntax)=>{
const match=syntax.match(/^<flashcards\b([^>]*)\/>$/i);
const attrs={};
String(match?.[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*"([^"]*)"/g,(_,key,value)=>{attrs[key]=value;});
String(match?.[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*'([^']*)'/g,(_,key,value)=>{attrs[key]=value;});
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cards=String(attrs.contents||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf(':');return i<0?{question:x,answer:''}:{question:x.slice(0,i).trim(),answer:x.slice(i+1).trim()};});
if(!cards.length)return '';
const first=cards[0];
return `<div class="knowledge-flashcards" data-index="0"><div class="knowledge-flashcard" onclick='this.classList.toggle("flipped")'><div class="knowledge-flash-side knowledge-flash-question">${esc(first.question)}</div><div class="knowledge-flash-side knowledge-flash-answer">${esc(first.answer)}</div></div><div class="knowledge-flash-controls"><button type="button" class="knowledge-flash-button" onclick='event.stopPropagation();const box=this.closest(".knowledge-flashcards"),data=[...box.querySelectorAll(".knowledge-flash-data")],i=Math.max(0,Number(box.dataset.index)-1);box.dataset.index=i;box.querySelector(".knowledge-flash-question").textContent=data[i]?.dataset.question||"";box.querySelector(".knowledge-flash-answer").textContent=data[i]?.dataset.answer||"";box.querySelector(".knowledge-flashcard").classList.remove("flipped");box.querySelector(".knowledge-flash-count").textContent=(i+1)+" / "+data.length'>Previous</button><span class="knowledge-flash-count">1 / ${cards.length}</span><button type="button" class="knowledge-flash-button" onclick='event.stopPropagation();const box=this.closest(".knowledge-flashcards"),data=[...box.querySelectorAll(".knowledge-flash-data")],i=Math.min(data.length-1,Number(box.dataset.index)+1);box.dataset.index=i;box.querySelector(".knowledge-flash-question").textContent=data[i]?.dataset.question||"";box.querySelector(".knowledge-flash-answer").textContent=data[i]?.dataset.answer||"";box.querySelector(".knowledge-flashcard").classList.remove("flipped");box.querySelector(".knowledge-flash-count").textContent=(i+1)+" / "+data.length'>Next</button></div>${cards.map(card=>`<div class="knowledge-flash-data" data-question="${esc(card.question)}" data-answer="${esc(card.answer)}" hidden></div>`).join('')}</div>`;
}
},
{
syntax:/<search\b[^>]*>([\s\S]*?)<\/search>/gi,
styling:`
.knowledge-search{color:#e4ca4e;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
`,
content:(syntax)=>{
const value=syntax.match(/^<search\b[^>]*>([\s\S]*?)<\/search>$/i)?.[1]?.trim()||'';
const safe=value.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
return `<a href="#" class="knowledge-search" data-search="${safe}" onclick='event.preventDefault();const input=document.getElementById("knowledgeSearch");input.value=this.dataset.search||"";input.dispatchEvent(new Event("input",{bubbles:true}));input.focus()'>${safe}</a>`;
}
},
{
syntax:/<goto\b([^>]*)>([\s\S]*?)<\/goto>/gi,
styling:`
.knowledge-goto{color:#e4ca4e;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
`,
content:(syntax)=>{
const match=syntax.match(/^<goto\b([^>]*)>([\s\S]*?)<\/goto>$/i);
const attrs={};
String(match?.[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*"([^"]*)"/g,(_,key,value)=>{attrs[key]=value;});
String(match?.[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*'([^']*)'/g,(_,key,value)=>{attrs[key]=value;});
const target=String(attrs.target||'');
const safeTarget=target.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const label=String(match?.[2]||target);
return `<a href="#" class="knowledge-goto" data-goto="${safeTarget}" onclick='event.preventDefault();const wanted=this.dataset.goto,from=this.closest("[data-knowledge-content]");if(!from)return;const same=[...from.querySelectorAll("[data-knowledge-gotarget]")].filter(x=>x.dataset.knowledgeGotarget===wanted);let page=from,target=null;if(same.length){const nodes=[...from.querySelectorAll("*")],sourceIndex=nodes.indexOf(this);target=same.sort((a,b)=>Math.abs(nodes.indexOf(a)-sourceIndex)-Math.abs(nodes.indexOf(b)-sourceIndex))[0]}if(!target){const section=from.dataset.knowledgeSection,currentIndex=Number(from.dataset.knowledgeIndex||0),candidates=[];for(const p of document.querySelectorAll("[data-knowledge-content]")){if(p.dataset.knowledgeSection!==section)continue;const index=Number(p.dataset.knowledgeIndex||0);for(const node of p.querySelectorAll("[data-knowledge-gotarget]"))if(node.dataset.knowledgeGotarget===wanted)candidates.push({page:p,node,distance:Math.abs(index-currentIndex)*100000+Math.abs(index-currentIndex)})}if(candidates.length){const best=candidates.sort((a,b)=>a.distance-b.distance)[0];page=best.page;target=best.node}}if(!target)return;if(page!==from){const id=page.dataset.knowledgeContent,button=[...document.querySelectorAll("[data-content-id]")].find(x=>x.dataset.contentId===id);if(!button)return;button.click();setTimeout(()=>{const targetPage=[...document.querySelectorAll("[data-knowledge-content]")].find(x=>x.dataset.knowledgeContent===id),next=targetPage?[...targetPage.querySelectorAll("[data-knowledge-gotarget]")].find(x=>x.dataset.knowledgeGotarget===wanted):null;next?.scrollIntoView({behavior:"smooth",block:"start"})},0)}else target.scrollIntoView({behavior:"smooth",block:"start"})'>${label}</a>`;
}
},
{
syntax:/<gotarget\b([^>]*)>([\s\S]*?)<\/gotarget>/gi,
styling:`
.knowledge-gotarget{scroll-margin-top:20px}
`,
content:(syntax)=>{
const match=syntax.match(/^<gotarget\b([^>]*)>([\s\S]*?)<\/gotarget>$/i);
const attrs={};
String(match?.[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*"([^"]*)"/g,(_,key,value)=>{attrs[key]=value;});
String(match?.[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*'([^']*)'/g,(_,key,value)=>{attrs[key]=value;});
const location=String(attrs.location||'');
const safe=location.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
return `<div class="knowledge-gotarget" data-knowledge-gotarget="${safe}">${match?.[2]||''}</div>`;
}
}
];