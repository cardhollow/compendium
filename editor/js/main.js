(()=>{
	const te=new TextEncoder();
	const td=new TextDecoder();
	const GITHUB_CONFIG={owner:'cardhollow',repo:'compendium',branch:'main'};
	const $=id=>document.getElementById(id);
	const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

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
		const response=await getRaw('../contents/dataCollection.json');
		const data=await response.json();
		return Array.isArray(data)?data:[];
	}

	async function getCD(path){
		const clean=String(path).replace(/^\/+/, '');
		const response=await getRaw(`../contents/${clean}`);
		return decode(new Uint8Array(await response.arrayBuffer()));
	}

	function base64Bytes(value){
		const binary=atob(value);
		const bytes=new Uint8Array(binary.length);
		for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
		return bytes;
	}

	async function deriveKey(username,password,salt,iterations){
		const base=await crypto.subtle.importKey('raw',te.encode(username+'\n'+password),'PBKDF2',false,['deriveKey']);
		return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
	}

	async function decryptSecret(username,password){
		const response=await getRaw('../contents/github-token.enc.json');
		const box=await response.json();
		if(!box?.salt||!box?.iv||!box?.data)throw new Error('Encrypted GitHub key is not configured.');
		const key=await deriveKey(username,password,base64Bytes(box.salt),Number(box.iterations)||600000);
		const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:base64Bytes(box.iv)},key,base64Bytes(box.data));
		return td.decode(plain);
	}

	function repoInfo(){
		return {owner:GITHUB_CONFIG.owner,repo:GITHUB_CONFIG.repo,branch:GITHUB_CONFIG.branch};
	}

	async function github(path,username,token,options={}){
		const repo=repoInfo();
		const clean=String(path).replace(/^\/+/, '');
		const url=`https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/contents/${clean}`;
		const headers={
			'Accept':'application/vnd.github+json',
			'Authorization':'Bearer '+token,
			'X-GitHub-Api-Version':'2022-11-28',
			'Content-Type':'application/json'
		};
		const response=await fetch(url,{...options,headers:{...headers,...(options.headers||{})}});
		let data=null;
		try{data=await response.json()}catch{}
		if(!response.ok)throw new Error(data?.message||`GitHub API HTTP ${response.status}`);
		return data;
	}

	function bytesBase64(bytes){
		let binary='';
		const chunkSize=0x8000;
		for(let i=0;i<bytes.length;i+=chunkSize)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunkSize,bytes.length)));
		return btoa(binary);
	}

	async function fileSha(path,username,token){
		try{return(await github(path,username,token)).sha}catch(error){if(/Not Found/i.test(error.message))return null;throw error}
	}

	async function putFile(path,bytes,message,username,token){
		const body={message,content:bytesBase64(bytes),branch:repoInfo().branch};
		const sha=await fileSha(path,username,token);
		if(sha)body.sha=sha;
		await github(path,username,token,{method:'PUT',body:JSON.stringify(body)});
	}

	async function deleteFile(path,message,username,token){
		const sha=await fileSha(path,username,token);
		if(!sha)return;
		await github(path,username,token,{method:'DELETE',body:JSON.stringify({message,sha,branch:repoInfo().branch})});
	}

	function makeFilename(value){
		const parts=String(value||'').split('/');
		if(parts.length!==2)return null;
		const section=parts[0].trim().replace(/\s+/g,'');
		const contentTitle=parts[1].trim().replace(/\s+/g,'');
		if(!section||!contentTitle)return null;
		const cleanPart=value=>value.replace(/[^A-Za-z0-9._-]/g,'_').replace(/^\.+/,'').slice(0,100);
		const name=`${cleanPart(section)}_${cleanPart(contentTitle)}.cd`;
		return name||null;
	}

	function setupEditor(){
		injectBlueprintStyles();

		const overlay=$('loginOverlay');
		const login=$('loginButton');
		const username=$('username');
		const password=$('password');
		const loginStatus=$('loginStatus');
		const editor=$('editorPage');
		const title=$('editorTitle');
		const text=$('editorText');
		const select=$('selectData');
		const save=$('saveData');
		const modal=$('dataModal');
		const close=$('closeData');
		const list=$('dataList');
		const saveStatus=$('saveStatus');

		if(!overlay||!login||!editor)return;

		let session=null;
		let currentFile='';

		editor.style.display='none';

		login.addEventListener('click',async()=>{
			const user=username.value.trim();
			const pass=password.value;

			if(!user||!pass){
				loginStatus.textContent='Username and password are required.';
				return;
			}

			login.disabled=true;
			loginStatus.textContent='Unlocking…';

			try{
				const token=await decryptSecret(user,pass);
				if(!token)throw new Error('The decrypted GitHub key is empty.');
				session={username:user,token};
				overlay.style.display='none';
				editor.style.display='grid';
				text.focus();
			}catch(error){
				loginStatus.textContent=error.message||'Login failed.';
				login.disabled=false;
			}
		});

		password.addEventListener('keydown',event=>{
			if(event.key==='Enter')login.click();
		});

		function closeDataModal(){
			modal.classList.remove('open');
		}

		function openDataModal(){
			modal.classList.add('open');
			loadDataList();
		}

		async function loadDataList(){
			list.innerHTML='<div class="data-empty">Loading…</div>';

			try{
				const paths=await getCollection();
				list.innerHTML='';

				if(!paths.length){
					list.innerHTML='<div class="data-empty">No data files.</div>';
					return;
				}

				paths.forEach(path=>{
					const row=document.createElement('div');
					row.className='data-row';

					const button=document.createElement('button');
					button.className='data-item';
					button.type='button';
					button.textContent=path;

					const remove=document.createElement('button');
					remove.className='data-delete';
					remove.type='button';
					remove.textContent='×';
					remove.title='Delete';

					button.addEventListener('click',async()=>{
						button.disabled=true;

						try{
							const data=await getCD(path);
							if(data&&typeof data==='object'&&typeof data.title==='string'&&data.title.includes('/'))title.value=data.title;
							else title.value=String(path).split('/').pop().replace(/\.cd$/i,'').replace(/_/,'/');
							text.value=data?.source??data?.content??'';
							currentFile=String(path).replace(/^\/+/, '');
							closeDataModal();
							text.focus();
						}catch(error){
							saveStatus.textContent=error.message||'Could not decode file.';
						}finally{
							button.disabled=false;
						}
					});

					remove.addEventListener('click',async event=>{
						event.stopPropagation();

						if(!session)return;
						if(!confirm(`Delete ${path}?\n\nThis will delete the file and remove it from dataCollection.json.`))return;

						button.disabled=true;
						remove.disabled=true;
						remove.textContent='…';

						try{
							const clean=String(path).replace(/^\/+/, '');
							await deleteFile('contents/'+clean,`Delete ${clean}`,session.username,session.token);

							const collection=await getCollection();
							const entry='/'+clean;
							const updated=collection.filter(item=>String(item)!==entry&&String(item)!==clean);

							if(updated.length!==collection.length){
								await putFile('contents/dataCollection.json',te.encode(JSON.stringify(updated,null,2)),`Remove ${entry} from dataCollection.json`,session.username,session.token);
							}

							if(currentFile===clean){
								currentFile='';
								title.value='';
								text.value='';
							}

							row.remove();

							if(!list.children.length)list.innerHTML='<div class="data-empty">No data files.</div>';
						}catch(error){
							saveStatus.textContent=error.message||'Delete failed.';
							button.disabled=false;
							remove.disabled=false;
							remove.textContent='×';
						}
					});

					row.append(button,remove);
					list.appendChild(row);
				});
			}catch(error){
				list.innerHTML=`<div class="data-empty">${esc(error.message)}</div>`;
			}
		}

		select.addEventListener('click',openDataModal);
		close.addEventListener('click',closeDataModal);

		modal.addEventListener('click',event=>{
			if(event.target===modal)closeDataModal();
		});

		title.addEventListener('input',()=>{
			if(title.validity.valid)title.setCustomValidity('');
		});

		save.addEventListener('click',async()=>{
			if(!session)return;

			const value=title.value.trim();

			if(!value||!title.checkValidity()||!makeFilename(value)){
				title.setCustomValidity('Use Section/Content Title.');
				title.reportValidity();
				saveStatus.textContent='Use Section/Content Title.';
				return;
			}

			title.setCustomValidity('');
			save.disabled=true;
			saveStatus.textContent='Saving…';

			try{
				const name=makeFilename(value);
				const path='contents/'+name;
				const encoded=encode({title:value,section:value.split('/')[0].trim(),contentTitle:value.split('/')[1].trim(),source:text.value});

				await putFile(path,encoded,`Save ${name}`,session.username,session.token);

				const collection=await getCollection();
				const entry='/'+name;

				if(!collection.includes(entry)){
					collection.push(entry);
					await putFile('contents/dataCollection.json',te.encode(JSON.stringify(collection,null,2)),`Update dataCollection.json`,session.username,session.token);
				}

				currentFile=path;
				saveStatus.textContent='Saved';
				setTimeout(()=>saveStatus.textContent='',1500);
			}catch(error){
				saveStatus.textContent=error.message||'Save failed.';
			}finally{
				save.disabled=false;
			}
		});
	}

	if($('editorPage'))setupEditor();
})();
