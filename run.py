
def get_sum_exp(l, cur_sum):
	return sum(j * i for i, j in enumerate(l)) + cur_sum


def get_exp(l, cur_sum):
	return get_sum_exp(l, cur_sum) / cur_sum


def get_names(v):
	if v is None:
		return set()
	if isinstance(v, str):
		return {v}
	if isinstance(v, list):
		return set(v)
	assert isinstance(v, tuple)
	c = v[0]
	d = v[1]
	s = set() if '' not in d else {c}
	for i in d.values():
		s |= get_names(i)
	return s


def main():
	import pickle
	with open('out.pkl', 'rb') as f:
		all_d, num_d = pickle.load(f)

	print('Start:')

	def guess_nk(cur_stage):
		if cur_stage < 6:
			return 7
		if cur_stage < 9:
			return 6
		if cur_stage < 12:
			return 5
		if cur_stage < 16:
			return 4
		return 3

	cur_stage = 1

	while True:
		try:
			nk_hint = guess_nk(cur_stage)
			nk = input(f'num_key({nk_hint}):')
			if not nk:
				nk = nk_hint
			else:
				nk = int(nk)
			cur_exp, cur_c, cur_l = num_d[nk][0]
			find_c = input(f'start_name({cur_c}):')
			if find_c:
				for cur_exp, cur_c, cur_l in num_d[nk]:
					if cur_c == find_c:
						break
				else:
					assert False, 'Name not found!'


			print(f'Start: {cur_c} Expect: {cur_exp} Dist: {cur_l}')
			if nk == 7:
				ks = '0123456'
			else:
				ks = input('cur_keys:')
			cur_l, cur_d = all_d[ks][cur_c]
			cur_exp = get_exp(cur_l, sum(cur_l))
			print(f'Expect: {cur_exp} Dist: {cur_l}')
			while True:
				k = input('cur res:')
				cur_v = cur_d[k]
				if cur_v is None:
					print(f'Success! (Guessed {cur_c})')
					break
				if isinstance(cur_v, str):
					print(f'Success: please guess {cur_v}')
					break
				elif isinstance(cur_v, list):
					print(f'Success: please guess from:', *cur_v, sep = ' ')
					break
				else:
					rem_names = get_names(cur_v)
					assert isinstance(cur_v, tuple)
					cur_c = cur_v[0]
					cur_d = cur_v[1]
					print(f'please guess {cur_c}, remain:', *list(rem_names), sep = ' ')
		except Exception as e:
			print(f'Error: "{e}"!')
		else:
			cur_stage += 1


if __name__ == '__main__':
	main()
