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
},
{
	syntax:/<higlight\b([^>]*)>([\s\S]*?)<\/higlight>/gi,
	styling:`
.knowledge-higlight{background:var(--knowledge-higlight-color,#f5e642);color:#202020;border-radius:2px;padding:0 3px;-webkit-box-decoration-break:clone;box-decoration-break:clone}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<higlight\b([^>]*)>([\s\S]*?)<\/higlight>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#f5e642').replace(/[<>&"']/g,'');
		return `<span class="knowledge-higlight" style="--knowledge-higlight-color:${color}">${match[2]}</span>`;
	}
},
{
	syntax:/<encircle\b([^>]*)>([\s\S]*?)<\/encircle>/gi,
	styling:`
.knowledge-encircle{position:relative;display:inline-block;padding:0 8px;z-index:0;transform:rotate(-.7deg)}.knowledge-encircle::before,.knowledge-encircle::after{content:"";position:absolute;inset:-4px -8px;border:2px solid var(--knowledge-encircle-color,#e05252);border-radius:47% 53% 52% 48% / 51% 46% 54% 49%;pointer-events:none}.knowledge-encircle::before{transform:rotate(-2deg)}.knowledge-encircle::after{inset:-2px -10px 0 -4px;transform:rotate(2.7deg);opacity:.6}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<encircle\b([^>]*)>([\s\S]*?)<\/encircle>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#e05252').replace(/[<>&"']/g,'');
		return `<span class="knowledge-encircle" style="--knowledge-encircle-color:${color}">${match[2]}</span>`;
	}
},
{
	syntax:/<underline\b([^>]*)>([\s\S]*?)<\/underline>/gi,
	styling:`
.knowledge-underline{text-decoration-line:underline;text-decoration-color:var(--knowledge-underline-color,#f5e642);text-decoration-thickness:2px;text-underline-offset:3px}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<underline\b([^>]*)>([\s\S]*?)<\/underline>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#f5e642').replace(/[<>&"']/g,'');
		return `<span class="knowledge-underline" style="--knowledge-underline-color:${color}">${match[2]}</span>`;
	}
},
{
	syntax:/<wavy\b([^>]*)>([\s\S]*?)<\/wavy>/gi,
	styling:`
.knowledge-wavy{text-decoration-line:underline;text-decoration-style:wavy;text-decoration-color:var(--knowledge-wavy-color,#e05252);text-decoration-thickness:2px;text-underline-offset:3px}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<wavy\b([^>]*)>([\s\S]*?)<\/wavy>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#e05252').replace(/[<>&"']/g,'');
		return `<span class="knowledge-wavy" style="--knowledge-wavy-color:${color}">${match[2]}</span>`;
	}
},
{
	syntax:/<badge\b([^>]*)>([\s\S]*?)<\/badge>/gi,
	styling:`
.knowledge-badge{display:inline-block;background:var(--knowledge-badge-color,#666);color:#fff;border-radius:999px;padding:2px 8px;font-size:.78em;line-height:1.35;vertical-align:middle}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<badge\b([^>]*)>([\s\S]*?)<\/badge>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#666').replace(/[<>&"']/g,'');
		return `<span class="knowledge-badge" style="--knowledge-badge-color:${color}">${match[2]}</span>`;
	}
},
{
	syntax:/<glow\b([^>]*)>([\s\S]*?)<\/glow>/gi,
	styling:`
.knowledge-glow{color:var(--knowledge-glow-color,#f5e642);text-shadow:0 0 8px var(--knowledge-glow-color,#f5e642)}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<glow\b([^>]*)>([\s\S]*?)<\/glow>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#f5e642').replace(/[<>&"']/g,'');
		return `<span class="knowledge-glow" style="--knowledge-glow-color:${color}">${match[2]}</span>`;
	}
},
{
	syntax:/<outline\b([^>]*)>([\s\S]*?)<\/outline>/gi,
	styling:`
.knowledge-outline{-webkit-text-stroke:1px var(--knowledge-outline-color,#e05252);color:transparent}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<outline\b([^>]*)>([\s\S]*?)<\/outline>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#e05252').replace(/[<>&"']/g,'');
		return `<span class="knowledge-outline" style="--knowledge-outline-color:${color}">${match[2]}</span>`;
	}
},
{
	syntax:/<gradient\b([^>]*)>([\s\S]*?)<\/gradient>/gi,
	styling:`
.knowledge-gradient{background:linear-gradient(90deg,var(--knowledge-gradient-from,#e05252),var(--knowledge-gradient-to,#6ba8ff));-webkit-background-clip:text;background-clip:text;color:transparent}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<gradient\b([^>]*)>([\s\S]*?)<\/gradient>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const from=String(attrs.from||'#e05252').replace(/[<>&"']/g,'');
		const to=String(attrs.to||'#6ba8ff').replace(/[<>&"']/g,'');
		return `<span class="knowledge-gradient" style="--knowledge-gradient-from:${from};--knowledge-gradient-to:${to}">${match[2]}</span>`;
	}
},
{
	syntax:/<blur\b([^>]*)>([\s\S]*?)<\/blur>/gi,
	styling:`
.knowledge-blur{filter:blur(var(--knowledge-blur-amount,4px));transition:filter .15s ease;cursor:pointer}.knowledge-blur:hover,.knowledge-blur:focus{filter:none}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<blur\b([^>]*)>([\s\S]*?)<\/blur>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const amount=String(attrs.amount||'4px').replace(/[^0-9.\-a-zA-Z%]/g,'');
		return `<span class="knowledge-blur" tabindex="0" style="--knowledge-blur-amount:${amount}">${match[2]}</span>`;
	}
},
{
	syntax:/<fade>([\s\S]*?)<\/fade>/gi,
	styling:`
.knowledge-fade{opacity:.45}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<fade>([\s\S]*?)<\/fade>$/i);
		if(!match)return '';
		return `<span class="knowledge-fade">${match[1]}</span>`;
	}
},
{
	syntax:/<marker\b([^>]*)>([\s\S]*?)<\/marker>/gi,
	styling:`
.knowledge-marker{position:relative;z-index:0}.knowledge-marker::before{content:"";position:absolute;z-index:-1;left:-3px;right:-3px;top:48%;height:.72em;transform:rotate(-1.5deg);background:var(--knowledge-marker-color,#f5e642);border-radius:4px;opacity:.8}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<marker\b([^>]*)>([\s\S]*?)<\/marker>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#f5e642').replace(/[<>&"']/g,'');
		return `<span class="knowledge-marker" style="--knowledge-marker-color:${color}">${match[2]}</span>`;
	}
},
{
	syntax:/<key\b([^>]*)>([\s\S]*?)<\/key>/gi,
	styling:`
.knowledge-key{display:inline-block;padding:1px 7px;border:1px solid #666;border-bottom-width:3px;border-radius:5px;background:#2a2a2a;color:#eee;font:600 .88em ui-monospace,SFMono-Regular,Consolas,monospace;white-space:nowrap;box-shadow:0 1px 0 #111}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<key\b([^>]*)>([\s\S]*?)<\/key>$/i);
		if(!match)return '';
		return `<span class="knowledge-key">${match[2]}</span>`;
	}
},
{
	syntax:/<redacted\b([^>]*)>([\s\S]*?)<\/redacted>/gi,
	styling:`
.knowledge-redacted{display:inline;background:#111;color:transparent;border-radius:2px;padding:0 2px;cursor:pointer;transition:color .15s ease}.knowledge-redacted:hover,.knowledge-redacted:focus{color:#ddd}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<redacted\b([^>]*)>([\s\S]*?)<\/redacted>$/i);
		if(!match)return '';
		return `<span class="knowledge-redacted" tabindex="0">${match[2]}</span>`;
	}
},
{
	syntax:/<scribble\b([^>]*)>([\s\S]*?)<\/scribble>/gi,
	styling:`
.knowledge-scribble{position:relative;display:inline-block}.knowledge-scribble::after{content:"";position:absolute;left:-2px;right:-2px;bottom:-3px;height:7px;border-bottom:2px solid var(--knowledge-scribble-color,#e05252);border-radius:50%;transform:rotate(-2deg)}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<scribble\b([^>]*)>([\s\S]*?)<\/scribble>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#e05252').replace(/[<>&"']/g,'');
		return `<span class="knowledge-scribble" style="--knowledge-scribble-color:${color}">${match[2]}</span>`;
	}
},
{
	syntax:/<cross\b([^>]*)>([\s\S]*?)<\/cross>/gi,
	styling:`
.knowledge-cross{position:relative;display:inline-block;color:var(--knowledge-cross-color,#e05252)}.knowledge-cross::before,.knowledge-cross::after{content:"";position:absolute;left:-3%;right:-3%;top:50%;height:2px;background:var(--knowledge-cross-color,#e05252)}.knowledge-cross::before{transform:rotate(10deg)}.knowledge-cross::after{transform:rotate(-10deg)}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<cross\b([^>]*)>([\s\S]*?)<\/cross>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#e05252').replace(/[<>&"']/g,'');
		return `<span class="knowledge-cross" style="--knowledge-cross-color:${color}">${match[2]}</span>`;
	}
},
{
	syntax:/<doubleunderline\b([^>]*)>([\s\S]*?)<\/doubleunderline>/gi,
	styling:`
.knowledge-doubleunderline{text-decoration-line:underline;text-decoration-style:double;text-decoration-color:var(--knowledge-doubleunderline-color,#f5e642);text-decoration-thickness:2px;text-underline-offset:3px}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<doubleunderline\b([^>]*)>([\s\S]*?)<\/doubleunderline>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#f5e642').replace(/[<>&"']/g,'');
		return `<span class="knowledge-doubleunderline" style="--knowledge-doubleunderline-color:${color}">${match[2]}</span>`;
	}
},
{
	syntax:/<annotation\b([^>]*)>([\s\S]*?)<\/annotation>/gi,
	styling:`
.knowledge-annotation{position:relative;display:inline-block;padding-bottom:11px}.knowledge-annotation::after{content:"annotation";position:absolute;left:0;bottom:-2px;color:#888;font-size:.62em;line-height:1;font-style:italic;white-space:nowrap}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<annotation\b([^>]*)>([\s\S]*?)<\/annotation>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const label=String(attrs.label||'annotation').replace(/[<>&"']/g,'');
		return `<span class="knowledge-annotation" style="--knowledge-annotation-label:'${label}'">${match[2]}</span>`;
	}
},
{
	syntax:/<protip\b([^>]*)>([\s\S]*?)<\/protip>/gi,
	styling:`
.knowledge-protip{display:block;margin:14px 0;padding:10px 12px;border-left:3px solid var(--knowledge-protip-color,#6ba8ff);background:color-mix(in srgb,var(--knowledge-protip-color,#6ba8ff) 10%,#292929);border-radius:4px}.knowledge-protip::before{content:"PRO TIP";display:block;margin-bottom:4px;color:var(--knowledge-protip-color,#6ba8ff);font-size:.72em;font-weight:700;letter-spacing:.08em}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<protip\b([^>]*)>([\s\S]*?)<\/protip>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#6ba8ff').replace(/[<>&"']/g,'');
		return `<div class="knowledge-protip" style="--knowledge-protip-color:${color}">${match[2]}</div>`;
	}
},
{
	syntax:/<example\b([^>]*)>([\s\S]*?)<\/example>/gi,
	styling:`
.knowledge-example{display:block;margin:14px 0;padding:10px 12px;border:1px solid var(--knowledge-example-color,#888);background:color-mix(in srgb,var(--knowledge-example-color,#888) 8%,#292929);border-radius:6px}.knowledge-example::before{content:"EXAMPLE";display:block;margin-bottom:4px;color:var(--knowledge-example-color,#888);font-size:.72em;font-weight:700;letter-spacing:.08em}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<example\b([^>]*)>([\s\S]*?)<\/example>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#888').replace(/[<>&"']/g,'');
		return `<div class="knowledge-example" style="--knowledge-example-color:${color}">${match[2]}</div>`;
	}
},
{
	syntax:/<important\b([^>]*)>([\s\S]*?)<\/important>/gi,
	styling:`
.knowledge-important{display:block;margin:14px 0;padding:10px 12px;border-left:4px solid var(--knowledge-important-color,#f5e642);background:color-mix(in srgb,var(--knowledge-important-color,#f5e642) 9%,#292929);border-radius:4px;font-weight:500}.knowledge-important::before{content:"IMPORTANT";display:block;margin-bottom:4px;color:var(--knowledge-important-color,#f5e642);font-size:.72em;font-weight:700;letter-spacing:.08em}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<important\b([^>]*)>([\s\S]*?)<\/important>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#f5e642').replace(/[<>&"']/g,'');
		return `<div class="knowledge-important" style="--knowledge-important-color:${color}">${match[2]}</div>`;
	}
},
{
	syntax:/<question\b([^>]*)>([\s\S]*?)<\/question>/gi,
	styling:`
.knowledge-question{display:block;margin:14px 0;padding:10px 12px;border-left:3px solid var(--knowledge-question-color,#e0a84b);background:color-mix(in srgb,var(--knowledge-question-color,#e0a84b) 8%,#292929);border-radius:4px}.knowledge-question::before{content:"QUESTION";display:block;margin-bottom:4px;color:var(--knowledge-question-color,#e0a84b);font-size:.72em;font-weight:700;letter-spacing:.08em}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<question\b([^>]*)>([\s\S]*?)<\/question>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#e0a84b').replace(/[<>&"']/g,'');
		return `<div class="knowledge-question" style="--knowledge-question-color:${color}">${match[2]}</div>`;
	}
},
{
	syntax:/<answer\b([^>]*)>([\s\S]*?)<\/answer>/gi,
	styling:`
.knowledge-answer{display:block;margin:14px 0;padding:10px 12px;border-left:3px solid var(--knowledge-answer-color,#67b56a);background:color-mix(in srgb,var(--knowledge-answer-color,#67b56a) 8%,#292929);border-radius:4px}.knowledge-answer::before{content:"ANSWER";display:block;margin-bottom:4px;color:var(--knowledge-answer-color,#67b56a);font-size:.72em;font-weight:700;letter-spacing:.08em}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<answer\b([^>]*)>([\s\S]*?)<\/answer>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#67b56a').replace(/[<>&"']/g,'');
		return `<div class="knowledge-answer" style="--knowledge-answer-color:${color}">${match[2]}</div>`;
	}
},
{
	syntax:/<spoiler\b([^>]*)>([\s\S]*?)<\/spoiler>/gi,
	styling:`
.knowledge-spoiler{display:inline;background:#111;color:transparent;border-radius:3px;padding:0 4px;cursor:pointer;transition:background .15s ease,color .15s ease}.knowledge-spoiler:hover,.knowledge-spoiler:focus{background:#353535;color:#ddd}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<spoiler\b([^>]*)>([\s\S]*?)<\/spoiler>$/i);
		if(!match)return '';
		return `<span class="knowledge-spoiler" tabindex="0">${match[2]}</span>`;
	}
},
{
	syntax:/<hollow\b([^>]*)>([\s\S]*?)<\/hollow>/gi,
	styling:`
.knowledge-hollow{-webkit-text-stroke:1px var(--knowledge-hollow-color,#e4ca4e);color:transparent}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<hollow\b([^>]*)>([\s\S]*?)<\/hollow>$/i);
		if(!match)return '';
		const attrs={};
		String(match[1]||'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*["']([^"']*)["']/g,(_,key,value)=>{attrs[key]=value;});
		const color=String(attrs.color||'#e4ca4e').replace(/[<>&"']/g,'');
		return `<span class="knowledge-hollow" style="--knowledge-hollow-color:${color}">${match[2]}</span>`;
	}
},
{
	syntax:/<emboss\b([^>]*)>([\s\S]*?)<\/emboss>/gi,
	styling:`
.knowledge-emboss{color:#ddd;text-shadow:-1px -1px 0 #fff,1px 1px 0 #111}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<emboss\b([^>]*)>([\s\S]*?)<\/emboss>$/i);
		if(!match)return '';
		return `<span class="knowledge-emboss">${match[2]}</span>`;
	}
},
{
	syntax:/<inset\b([^>]*)>([\s\S]*?)<\/inset>/gi,
	styling:`
.knowledge-inset{color:#bbb;text-shadow:1px 1px 0 #111,-1px -1px 0 #444}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<inset\b([^>]*)>([\s\S]*?)<\/inset>$/i);
		if(!match)return '';
		return `<span class="knowledge-inset">${match[2]}</span>`;
	}
},
{
	syntax:/<shake\b([^>]*)>([\s\S]*?)<\/shake>/gi,
	styling:`
@keyframes knowledge-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-2px)}75%{transform:translateX(2px)}}.knowledge-shake{display:inline-block}.knowledge-shake:hover{animation:knowledge-shake .28s ease-in-out infinite}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<shake\b([^>]*)>([\s\S]*?)<\/shake>$/i);
		if(!match)return '';
		return `<span class="knowledge-shake">${match[2]}</span>`;
	}
},
{
	syntax:/<pulse\b([^>]*)>([\s\S]*?)<\/pulse>/gi,
	styling:`
@keyframes knowledge-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.03)}}.knowledge-pulse{display:inline-block}.knowledge-pulse:hover{animation:knowledge-pulse .9s ease-in-out infinite}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<pulse\b([^>]*)>([\s\S]*?)<\/pulse>$/i);
		if(!match)return '';
		return `<span class="knowledge-pulse">${match[2]}</span>`;
	}
},
{
	syntax:/<reveal\b([^>]*)>([\s\S]*?)<\/reveal>/gi,
	styling:`
.knowledge-reveal{display:inline-block;clip-path:inset(0 100% 0 0);transition:clip-path .35s ease}.knowledge-reveal:hover,.knowledge-reveal:focus{clip-path:inset(0 0 0 0)}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<reveal\b([^>]*)>([\s\S]*?)<\/reveal>$/i);
		if(!match)return '';
		return `<span class="knowledge-reveal" tabindex="0">${match[2]}</span>`;
	}
},
{
	syntax:/<compare\b([^>]*)>([\s\S]*?)<\/compare>/gi,
	styling:`
.knowledge-compare{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:14px 0;border:1px solid #444;border-radius:6px;overflow:hidden;background:#292929}.knowledge-compare .knowledge-before,.knowledge-compare .knowledge-after{margin:0;padding:10px 12px}.knowledge-compare .knowledge-before{border-right:1px solid #444;background:rgba(224,82,82,.07)}.knowledge-compare .knowledge-after{background:rgba(103,181,106,.07)}.knowledge-compare .knowledge-before::before{content:"BEFORE";display:block;margin-bottom:4px;color:#e05252;font-size:.72em;font-weight:700;letter-spacing:.08em}.knowledge-compare .knowledge-after::before{content:"AFTER";display:block;margin-bottom:4px;color:#67b56a;font-size:.72em;font-weight:700;letter-spacing:.08em}@media(max-width:600px){.knowledge-compare{grid-template-columns:1fr}.knowledge-compare .knowledge-before{border-right:0;border-bottom:1px solid #444}}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<compare\b([^>]*)>([\s\S]*?)<\/compare>$/i);
		if(!match)return '';
		return `<div class="knowledge-compare">${match[2]}</div>`;
	}
},
{
	syntax:/<before\b([^>]*)>([\s\S]*?)<\/before>/gi,
	styling:`
.knowledge-before{color:#ddd}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<before\b([^>]*)>([\s\S]*?)<\/before>$/i);
		if(!match)return '';
		return `<div class="knowledge-before">${match[2]}</div>`;
	}
},
{
	syntax:/<after\b([^>]*)>([\s\S]*?)<\/after>/gi,
	styling:`
.knowledge-after{color:#ddd}
`,
	content:(syntax)=>{
		const match=syntax.match(/^<after\b([^>]*)>([\s\S]*?)<\/after>$/i);
		if(!match)return '';
		return `<div class="knowledge-after">${match[2]}</div>`;
	}
}
];