(()=>{
	const title=document.getElementById('title');
	const source=document.getElementById('source');
	const download=document.getElementById('download');
	const toast=document.getElementById('toast');

	function showToast(message){
		toast.textContent=message;
		toast.classList.add('show');
		clearTimeout(showToast.timer);
		showToast.timer=setTimeout(()=>toast.classList.remove('show'),2200);
	}

	function hasSectionAndContent(value){
		const sections=String(value||'').match(/<section\b[^>]*>[\s\S]*?<\/section>/gi)||[];
		for(const section of sections){
			if(/<content\b[^>]*>[\s\S]*?<\/content>/i.test(section))return true;
		}
		return false;
	}

	function filename(value){
		const name=String(value||'Untitled').trim().replace(/\s+/g,'').replace(/[^A-Za-z0-9._-]/g,'_').replace(/^\.+/,'').slice(0,120)||'Untitled';
		return name.endsWith('.cd')?name:name+'.cd';
	}

	download.addEventListener('click',()=>{
		const titleValue=title.value.trim();
		const sourceValue=source.value;

		if(!titleValue){
			showToast('Title is required');
			title.focus();
			return;
		}

		if(!hasSectionAndContent(sourceValue)){
			showToast('Save requires a <section> containing a <content>');
			source.focus();
			return;
		}

		try{
			const name=filename(titleValue);
			const bytes=encode({
				title:titleValue,
				source:sourceValue
			});
			const url=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));
			const a=document.createElement('a');
			a.href=url;
			a.download=name;
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(()=>URL.revokeObjectURL(url),1000);
			showToast('Downloaded '+name);
		}catch(error){
			showToast(error.message||'Could not encode CD');
		}
	});
})();
