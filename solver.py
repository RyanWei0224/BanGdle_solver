from characters import CHARACTERS, KEYS

GUESS_RES = []


def get_sum_exp(l, cur_sum):
	return sum(j * i for i, j in enumerate(l)) + cur_sum


def get_exp(l, cur_sum):
	return get_sum_exp(l, cur_sum) / cur_sum


def comp_list(l1, l2, l_exp):
	l_exp -= 1
	var1 = sum(j * (i-l_exp)**2 for i, j in enumerate(l1))
	var2 = sum(j * (i-l_exp)**2 for i, j in enumerate(l2))
	return var1 < var2


def merge_list(l, add_l):
	if len(add_l) <= len(l):
		cur_len = len(add_l)
	else:
		cur_len = len(l)
		l += add_l[cur_len:]

	for i in range(cur_len):
		l[i] += add_l[i]


def _guess_with(characters, cur_c, max_lim = None):
	if max_lim is None:
		max_lim = (len(characters) * (len(characters) + 1)) // 2

	# Minus current guess
	max_lim -= len(characters)

	zero_list = []
	has_same = False

	char_dict = dict()
	for c in characters:
		if c == cur_c:
			has_same = True
			continue
		guess_res = GUESS_RES[cur_c][c]
		if guess_res == 0:
			zero_list.append(c)
			continue
		if guess_res not in char_dict:
			char_dict[guess_res] = []
		char_dict[guess_res].append(c)

	# Estimate minimal limit
	tot_exp = (len(zero_list) * (len(zero_list) + 1)) // 2
	for res, cl in char_dict.items():
		tot_exp += len(cl) * 2 - 1

	if tot_exp > max_lim:
		return None

	res_list = []
	res_dict = dict()

	for res, cl in char_dict.items():
		other_exp = tot_exp - (2 * len(cl) - 1)
		cur_maxl = max_lim - other_exp

		cur_res = guess(cl, max_lim = cur_maxl) # TODO: change here to "cur_maxl" for faster calculation
		if cur_res is None:
			return None

		guess_c, dist_l, guess_cdict = cur_res

		new_tot_exp = other_exp + get_sum_exp(dist_l, len(cl))
		assert new_tot_exp >= tot_exp and new_tot_exp <= max_lim, (new_tot_exp, tot_exp, max_lim, dist_l)
		tot_exp = new_tot_exp

		res_dict[res] = guess_c if guess_cdict is None else (guess_c, guess_cdict)
		merge_list(res_list, dist_l)

	if zero_list:
		res_dict[0] = zero_list if len(zero_list) > 1 else zero_list[0]
		dist_l = [1] * len(zero_list)
		merge_list(res_list, dist_l)

	if has_same:
		res_dict[-1] = None

	res_list = [1 if has_same else 0,] + res_list

	return (cur_c, res_list, res_dict)


def _guess(characters, max_lim = None):
	if max_lim is None:
		max_lim = (len(characters) * (len(characters) + 1)) // 2

	if max_lim < 2 * len(characters) - 1:
		return None

	if len(characters) == 1:
		return (characters[0], [1,], None)

	if len(characters) == 2:
		cur_g = GUESS_RES[characters[0]][characters[1]]
		return (characters[0], [1, 1], {-1: characters[0], cur_g: characters[1]})

	all_chars = characters.copy()
	cur_it = 0
	for c in range(len(GUESS_RES)):
		if c == characters[cur_it]:
			if cur_it != len(characters) - 1:
				cur_it += 1
		else:
			all_chars.append(c)

	min_res = None
	for c in all_chars:
		res = guess_with(characters, c, max_lim = max_lim)
		if res is None:
			continue

		cur_sum = get_sum_exp(res[1], len(characters))
		assert cur_sum <= max_lim
		cur_exp = cur_sum / len(characters)

		if min_res is None or (cur_sum < max_lim) or comp_list(res[1], min_res[1], cur_exp):
			min_res = res
			max_lim = cur_sum

	return min_res


if False:
	STACK_LEN = 0

	def guess_with(characters, cur_c, max_lim = None):
		global STACK_LEN
		pref = ' ' * STACK_LEN
		print(f'{pref}guess_with({characters}, {cur_c}, {max_lim})')
		STACK_LEN += 1
		res = _guess_with(characters, cur_c, max_lim = max_lim)
		STACK_LEN -= 1
		print(f'{pref}end guess_with()')
		return res

	def guess(characters, max_lim = None):
		global STACK_LEN
		pref = ' ' * STACK_LEN
		print(f'{pref}guess({characters}, {max_lim})')
		STACK_LEN += 1
		res = _guess(characters, max_lim = max_lim)
		STACK_LEN -= 1
		print(f'{pref}end guess()')
		return res
else:
	guess_with = _guess_with
	guess = _guess


def comp(keys, guess_c, real_c):
	res = 0
	for k in keys:
		g = guess_c[k]
		r = real_c[k]
		if isinstance(g, int):
			res *= 3
			if g > r:
				res += 1 # down
			elif g < r:
				res += 2 # up
		elif isinstance(g, str):
			res *= 2
			if g != r:
				res += 1
		else:
			assert isinstance(g, list)
			res *= 3
			g = set(g)
			r = set(r)
			if g == r:
				pass
			elif g & r:
				res += 1 # yellow
			else:
				res += 2 # red

	return res


def to_str(res, keys, c):
	if res < 0:
		return ''
	l = []
	for k in reversed(keys):
		it = c[k]
		if isinstance(it, int):
			r = res % 3
			res //= 3
			if r == 0:
				l.append('o')
			elif r == 1:
				l.append('d') # ↓
			else:
				l.append('u') # ↑
		elif isinstance(it, str):
			r = res % 2
			res //= 2
			if r == 0:
				l.append('o')
			else:
				l.append('x')
		else:
			r = res % 3
			res //= 3
			if r == 0:
				l.append('o')
			elif r == 1:
				l.append('p')
			else:
				l.append('x')

	l.reverse()
	res_str = ''.join(l)
	return res_str


def get_name(c):
	return CHARACTERS[c]['name']


def translate_dict(res_d, keys, cref):
	new_res = dict()
	for k, v in sorted(res_d.items()):
		new_k = to_str(k, keys, cref)
		if v is None:
			new_v = None
		elif isinstance(v, int):
			new_v = get_name(v)
		elif isinstance(v, list):
			new_v = [get_name(i) for i in v]
		else:
			new_v = (get_name(v[0]), translate_dict(v[1], keys, cref))
		new_res[new_k] = new_v
	return new_res

def translate_res(res, keys, cref):
	res_c, res_l, res_d = res
	res_c = get_name(res_c)
	res_d = translate_dict(res_d, keys, cref)
	return (res_c, res_l, res_d)


def guess_all(characters, keys):
	res_all = dict()
	for c in characters:
		res = guess_with(characters, c)
		res = translate_res(res, keys, CHARACTERS[0])
		res_all[res[0]] = res[1:]
	return res_all


def guess_len(characters, keys, nk):
	import itertools
	n = len(characters)
	res_dict = dict()
	char_dict = dict()
	for tpl in itertools.combinations(range(len(keys)), nk):
		cur_keys = tuple(keys[i] for i in tpl)
		cur_kstr = ''.join([str(i) for i in tpl])

		for i in range(n):
			for j in range(n):
				ci = CHARACTERS[i]
				cj = CHARACTERS[j]
				GUESS_RES[i][j] = comp(cur_keys, ci, cj)

		print(f'Guess {cur_kstr}')

		cur_res = guess_all(characters, cur_keys)
		res_dict[cur_kstr] = cur_res
		for c, (l, _) in cur_res.items():
			if c not in char_dict:
				char_dict[c] = l
			else:
				merge_list(char_dict[c], l)

	char_list = []
	for c, l in char_dict.items():
		cur_exp = get_exp(l, sum(l))
		char_list.append((cur_exp, c, l))
	char_list.sort()
	return char_list, res_dict


def dump():
	import pickle
	with open('out.pkl', 'rb') as f:
		all_d, num_d = pickle.load(f)
	import json
	with open('out.json', 'w', encoding = 'utf-8') as f:
		json.dump([all_d, num_d], f, ensure_ascii = False)


def generate():
	n = len(CHARACTERS)
	for i in range(n):
		GUESS_RES.append([None for _ in range(n)])

	keys = KEYS

	all_d = dict()
	num_d = dict()

	with open('out.txt', 'w', encoding = 'utf-8') as out_f:
		characters = list(range(n))
		for nk in range(7, 3-1, -1):
			char_l, res_d = guess_len(characters, keys, nk)
			all_d.update(res_d)
			num_d[nk] = char_l
			print(f'num: {nk}', file = out_f)
			import json
			json.dump(char_l, out_f, indent = 2, ensure_ascii = False)

	import pickle
	with open('out.pkl', 'wb') as f:
		pickle.dump((all_d, num_d), f)


if __name__ == '__main__':
	generate()
	dump()
