
function submit(name){
	let g = document.getElementById("guessInput");
	g.value = name;
	let b = document.getElementById("guessBtn");
	b.click();
}

function get_res(){
	let res = 0;
	let keys = "";
	let vals = "";
	let r = document.getElementById("result").textContent;
	if(r === "❌ 不是这个人物哦"){
		res = 0;
	}else if(r.startsWith("挑战模式")){
		let m = r.match(/挑战模式：准备猜第 *(\d+) *位角色.*/);
		if(m === null){
			res = 1;
		}else{
			res = Number(m[1]);
		}
	}else if(r.startsWith(" 您已经耗尽所有猜测次数！你共猜对了")){
		res = -1;
	}else{
		throw new Error(`Unknown r: ${r}`);
	}

	if(res != 0){
		return [res, keys, vals];
	}

	let b = document.getElementById("board");
	let rs = b.children[0].children;
	for(let i = 1; i < rs.length; i++){
		let v = rs[i];
		let c = v.classList[1];
		if(c === "ban"){
			continue;
		}
		keys += (i-1).toString();
		if(c === "bad"){
			let t = v.textContent;
			if(t.endsWith("↑")){
				vals += "u";
			}else if(t.endsWith("↓")){
				vals += "d";
			}else{
				vals += "x";
			}
		}else if(c === "partial"){
			vals += "p";
		}else if(c === "ok"){
			vals += "o";
		}else{
			throw new Error(`Unknown c: ${c}`);
		}
	}
	return [res, keys, vals];
}

function read_json(){
	return new Promise((resolve, reject) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json, application/json';

		input.onchange = function(event) {
			const file = event.target.files[0];
			console.log(file);
			if (!file){
				reject(new Error('no file selected'));
				return;
			}
			const reader = new FileReader();
			reader.onload = function(e) {
				try {
					var jsonData = JSON.parse(e.target.result);
					resolve(jsonData);
				} catch (error) {
					reject(new Error(`json load failed! ${error}`));
				}
			};
			reader.onerror = () => reject(new Error('json load failed!'));
			reader.readAsText(file);
		};

		input.click();
	});
}

function guess_once(nround, all_d, num_d) {
	var cur_res;

	function guess_nk(cur_stage){
		if(cur_stage < 6){
			return 7;
		}else if(cur_stage < 9){
			return 6;
		}else if(cur_stage < 12){
			return 5;
		}else if(cur_stage < 16){
			return 4;
		}
		return 3;
	}

	let nk = guess_nk(nround);
	let cur_c = num_d[nk][0][1];

	submit(cur_c);
	cur_res = get_res();
	if(cur_res[0] != 0){
		return cur_res[0];
	}

	let ks = cur_res[1];
	let cur_d = all_d[ks][cur_c][1];

	while(true){
		let k = cur_res[2];
		let cur_v = cur_d[k];

		if(cur_v === null){
			throw new Error("Error: should not be null!");
		}

		if(typeof cur_v === 'string'){
			submit(cur_v);
			cur_res = get_res();
			if(cur_res[0] <= 0){
				throw new Error("Error: should succeed!");
			}
			return cur_res[0];
		}

		if(!(cur_v instanceof Array)){
			console.log(cur_v);
			throw new Error("Error: unknown type of cur_v!");
		}

		if(cur_v.length === 2 && (typeof cur_v[1] != 'string')){
			cur_c = cur_v[0];
			cur_d = cur_v[1];
			submit(cur_c);
		}else{
			for(let i = 0; i < cur_v.length; i++){
				submit(cur_v[i]);
				cur_res = get_res();
				if(cur_res[0] != 0){
					return cur_res[0];
				}
			}
			throw new Error("Error: all of them are wrong!");
		}

		cur_res = get_res();
		if(cur_res[0] != 0){
			return cur_res[0];
		}
	}
}

function start_guess(all_d, num_d){
	let nround = get_res()[0];
	if(nround <= 0){
		throw new Error("Please start from beginning!");
	}

	while(nround != -1){
		nround = guess_once(nround, all_d, num_d);
	}
}

var res = await read_json();
var all_d = res[0];
var num_d = res[1];
start_guess(all_d, num_d);
