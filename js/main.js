(()=>{
	const $=id=>document.getElementById(id);
	const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
	const strip=s=>String(s??'').replace(/<[^>]*>/g,' ');

	function attributes(s){
		const result={};
		String(s??'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*"([^"]*)"/g,(_,key,value)=>{result[key]=value;});
		String(s??'').replace(/([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*'([^']*)'/g,(_,key,value)=>{result[key]=value;});
		return result;
	}

	function renderHTML(value){
		let html=String(value??'');
		for(const rule of renderBlueprint||[]){
			if(!(rule?.syntax instanceof RegExp)||typeof rule.content!=='function')continue;
			rule.syntax.lastIndex=0;
			html=html.replace(rule.syntax,match=>String(rule.content(match)??''));
		}
		return html;
	}

	function injectBlueprintStyles(){
		if(document.getElementById('knowledgeBlueprintStyles'))return;
		const style=document.createElement('style');
		style.id='knowledgeBlueprintStyles';
		style.textContent=(renderBlueprint||[]).map(x=>typeof x.styling==='string'?x.styling:'').join('\n');
		document.head.appendChild(style);
	}

	async function getRaw(path){
		const response=await fetch(path,{cache:'no-store'});
		if(!response.ok)throw new Error(`HTTP ${response.status} while reading ${path}`);
		return response;
	}

	async function getCollection(){
		const response=await getRaw('contents/dataCollection.json');
		const data=await response.json();
		return Array.isArray(data)?data:[];
	}

	async function getCD(path){
		const clean=String(path).replace(/^\/+/, '');
		const response=await getRaw(`contents/${clean}`);
		return decode(new Uint8Array(await response.arrayBuffer()));
	}

	function parseDocument(text){
		const result=[];
		const root=text.match(/<root\b[^>]*>([\s\S]*?)<\/root>/i);
		const rootText=root?root[1]:text;
		const sectionRegex=/<section\b([^>]*)>([\s\S]*?)<\/section>/gi;
		let sectionMatch;

		while(sectionMatch=sectionRegex.exec(rootText)){
			const sectionAttributes=attributes(sectionMatch[1]);
			const section={title:sectionAttributes.title||'Section',items:[]};
			const contentRegex=/<content\b([^>]*)>([\s\S]*?)<\/content>/gi;
			let contentMatch;

			while(contentMatch=contentRegex.exec(sectionMatch[2])){
				const contentAttributes=attributes(contentMatch[1]);
				section.items.push({
					id:contentAttributes.id||`${section.title}-${section.items.length}`,
					subtitle:contentAttributes.title||`Content ${section.items.length+1}`,
					desc:contentAttributes.desc||'',
					contents:renderHTML(contentMatch[2])
				});
			}

			result.push(section);
		}

		return result;
	}

	function matches(item,terms){
		const hay=(item.section+' '+item.subtitle+' '+item.desc+' '+strip(item.contents)).toLowerCase();
		return terms.every(term=>hay.includes(term));
	}

	function relevance(item,terms){
		const title=item.subtitle.toLowerCase();
		const section=item.section.toLowerCase();
		const body=strip(item.contents).toLowerCase();
		let score=0;

		for(const term of terms){
			if(title===term)score+=1000;
			if(title.startsWith(term))score+=300;
			if(section===term)score+=120;
			if(section.startsWith(term))score+=80;
			if(title.includes(term))score+=100;
			if(body.includes(term))score+=10;
		}

		return score;
	}

	function best(list,terms){
		let bestItem=list[0];
		let bestScore=-Infinity;

		for(const item of list){
			const score=relevance(item.item,terms);
			if(score>bestScore){
				bestItem=item;
				bestScore=score;
			}
		}

		return bestItem;
	}

	function setupViewer(){
		injectBlueprintStyles();

		const nav=$('knowledgeNav');
		const main=$('knowledgeContent');
		const search=$('knowledgeSearch');

		if(!nav||!main||!search)return;

		let sections=[];
		let selected=null;
		let openState=Object.create(null);
		let autoSelectBest=false;

		function render(){
			const terms=search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
			const filtered=[];

			sections.forEach((section,si)=>{
				section.items.forEach((item,ii)=>{
					const normalized={...item,section:section.title};
					if(!terms.length||matches(normalized,terms))filtered.push({si,ii,item:normalized});
				});
			});

			const first=filtered[0];

			if(first&&(!selected||!filtered.some(item=>item.si===selected.si&&item.ii===selected.ii)||autoSelectBest)){
				const preferred=autoSelectBest&&terms.length?best(filtered,terms):first;
				selected={si:preferred.si,ii:preferred.ii};
			}

			autoSelectBest=false;
			if(!first)selected=null;

			nav.innerHTML='';

			sections.forEach((section,si)=>{
				const hasHits=filtered.some(item=>item.si===si);
				if(terms.length&&!hasHits)return;

				const wrap=document.createElement('section');
				wrap.className='knowledge-section';

				const title=document.createElement('button');
				title.className='knowledge-title';
				title.type='button';

				const collapsed=!!openState[si];
				title.innerHTML=`<span class="arrow">${collapsed?'+':'−'}</span><span>${esc(section.title)}</span>`;

				const items=document.createElement('div');
				items.className='knowledge-items'+(collapsed?' hidden':'');

				section.items.forEach((item,ii)=>{
					const normalized={...item,section:section.title};
					if(terms.length&&!matches(normalized,terms))return;

					const button=document.createElement('button');
					button.className='knowledge-subtitle'+(selected?.si===si&&selected?.ii===ii?' active':'');
					button.type='button';
					button.textContent=item.subtitle;
					button.title=item.desc;
					button.dataset.contentId=item.id;
					button.addEventListener('click',()=>{
						selected={si,ii};
						render();
					});
					items.appendChild(button);
				});

				title.addEventListener('click',()=>{
					openState[si]=!openState[si];
					render();
				});

				wrap.append(title,items);
				nav.appendChild(wrap);
			});

			showSelected();
		}

		function showSelected(){
			if(!selected){
				main.innerHTML='<div class="knowledge-empty">No result matches this search.</div>';
				return;
			}

			main.innerHTML=sections.map((section,si)=>section.items.map((item,ii)=>`<div class="knowledge-content-page${selected.si===si&&selected.ii===ii?' active':''}" data-knowledge-content="${esc(item.id)}" data-knowledge-section="${esc(section.title)}" data-knowledge-index="${ii}">${item.contents}</div>`).join('')).join('');
			const active=main.querySelector('.knowledge-content-page.active');
			if(active)active.scrollTop=0;
		}

		search.addEventListener('input',()=>{
			autoSelectBest=true;
			render();
		});

		getCollection().then(async list=>{
			if(!list.length)throw new Error('dataCollection.json contains no data files.');
			const data=await getCD(list[0]);
			const source=typeof data==='string'?data:data?.source??data?.content??'';
			sections=parseDocument(source);
			render();
		}).catch(error=>{
			main.innerHTML=`<div class="knowledge-empty">Could not load the compendium: ${esc(error.message)}</div>`;
		});
	}

	if($('knowledgeViewer'))setupViewer();
})();
