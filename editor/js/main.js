(()=>{
	const te=new TextEncoder();
	const td=new TextDecoder();
	const GITHUB_CONFIG={owner:'cardhollow',repo:'compendium',branch:'main'};
	const $=id=>document.getElementById(id);
	const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

	function injectBlueprintStyles(){
		if($('knowledgeBlueprintStyles'))return;
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

	async function github(path,token,options={}){
		const repo=repoInfo();
		const clean=String(path).replace(/^\/+/, '');
		const url=`https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/contents/${clean}`;
		const headers={'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
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

	async function fileSha(path,token){
		try{return(await github(path,token)).sha}catch(error){if(/Not Found/i.test(error.message))return null;throw error}
	}

	async function putFile(path,bytes,message,token){
		const body={message,content:bytesBase64(bytes),branch:repoInfo().branch};
		const sha=await fileSha(path,token);
		if(sha)body.sha=sha;
		await github(path,token,{method:'PUT',body:JSON.stringify(body)});
	}

	async function deleteFile(path,message,token){
		const sha=await fileSha(path,token);
		if(!sha)return;
		await github(path,token,{method:'DELETE',body:JSON.stringify({message,sha,branch:repoInfo().branch})});
	}


	function cdFilename(title){
		let name=String(title||'Untitled').trim().replace(/\s+/g,'');
		name=name.replace(/[^A-Za-z0-9._-]/g,'_').replace(/^\.+/,'').slice(0,120)||'Untitled';
		return name.endsWith('.cd')?name:name+'.cd';
	}

	function hasSectionAndContent(source){
		const sections=String(source||'').match(/<section\b[^>]*>[\s\S]*?<\/section>/gi)||[];
		for(const section of sections){
			if(/<content\b[^>]*>[\s\S]*?<\/content>/i.test(section))return true;
		}
		return false;
	}

	function showToast(message){
		const toast=$('editorToast');
		if(!toast)return;
		toast.textContent=message;
		toast.classList.add('show');
		clearTimeout(showToast.timer);
		showToast.timer=setTimeout(()=>toast.classList.remove('show'),2200);
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

		select.addEventListener('click',async()=>{
			modal.classList.add('open');
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

					button.addEventListener('click',async()=>{
						button.disabled=true;

						try{
							const data=await getCD(path);
							title.value=String(data?.title||String(path).split('/').pop()?.replace(/\.cd$/i,'')||'');
							text.value=String(data?.source??data?.content??'');
							currentFile=String(path).replace(/^\/+/, '');
							modal.classList.remove('open');
							text.focus();
						}catch(error){
							showToast(error.message||'Could not decode file.');
						}finally{
							button.disabled=false;
						}
					});

					const deleteButton=document.createElement('button');
					deleteButton.className='data-delete';
					deleteButton.type='button';
					deleteButton.textContent='×';
					deleteButton.title='Delete';

					deleteButton.addEventListener('click',async()=>{
						if(!session)return;
						if(!confirm(`Delete ${path}?\n\nThis will remove the CD file and its entry from dataCollection.json.`))return;

						deleteButton.disabled=true;
						button.disabled=true;
						showToast('Deleting…');

						try{
							const clean=String(path).replace(/^\/+/, '');
							const collection=await getCollection();
							const next=collection.filter(item=>String(item).replace(/^\/+/, '')!==clean);

							await deleteFile('contents/'+clean,`Delete ${clean}`,session.token);
							await putFile('contents/dataCollection.json',te.encode(JSON.stringify(next,null,2)),`Update dataCollection.json`,session.token);

							if(currentFile===clean){
								currentFile='';
								title.value='';
								text.value='';
							}

							row.remove();
							showToast('Deleted');
						}catch(error){
							showToast(error.message||'Delete failed');
							deleteButton.disabled=false;
							button.disabled=false;
						}
					});

					row.append(button,deleteButton);
					list.appendChild(row);
				});
			}catch(error){
				list.innerHTML=`<div class="data-empty">${esc(error.message)}</div>`;
			}
		});

		close.addEventListener('click',()=>modal.classList.remove('open'));
		modal.addEventListener('click',event=>{
			if(event.target===modal)modal.classList.remove('open');
		});

		save.addEventListener('click',async()=>{
			if(!session)return;

			const titleValue=title.value.trim();
			const sourceValue=text.value;

			if(!titleValue){
				showToast('Title is required');
				title.focus();
				return;
			}

			if(!hasSectionAndContent(sourceValue)){
				showToast('Save requires a <section> containing a <content>');
				text.focus();
				return;
			}

			save.disabled=true;
			showToast('Saving…');

			try{
				const name=cdFilename(titleValue);
				const path='contents/'+name;
				const encoded=encode({
					title:titleValue,
					source:sourceValue
				});

				await putFile(path,encoded,`Save ${name}`,session.token);

				let collection=await getCollection().catch(()=>[]);
				if(!Array.isArray(collection))collection=[];

				const entry='/'+name;
				if(!collection.some(item=>String(item).replace(/^\/+/, '')===name)){
					collection.push(entry);
					await putFile('contents/dataCollection.json',te.encode(JSON.stringify(collection,null,2)),`Update dataCollection.json`,session.token);
				}

				currentFile=name;
				showToast('Saved');
			}catch(error){
				showToast(error.message||'Save failed');
			}finally{
				save.disabled=false;
			}
		});
	}
	if($('editorPage'))setupEditor();
})();
