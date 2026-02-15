
# BanGdle_solver

Solves the [BanGdle game](https://xuewa-bilibili.github.io/BanGdle/) created by xuewa-bilibili, including a manual python script that gives the best guess, and an automatic javascript that guesses directly in the browser.

## How To Use

To make the browser guessing automatically, one can use the javascript *run.js* or *run_async.js*.

To enjoy the game and play it manually, or to use the solver as a reference only, one can use the python script *run.py*.

### run.js (run_async.js)

There are two files:
- *run.js* has no delay between guesses, and will finish 200 guesses in 0.5s
- *run_async.js* has delay between guesses, so one can observe the guessing process
    - The interval between guesses is controlled by the variable *SLEEP_INTV* (in ms), and one can modify it for faster/slower guesses.

The simplest way of using the js file is to copy it and paste into the console of the browser. Before running the script, change the game to *challenge mode* and  make sure the game is freshly started.

When running the js file, the browser will open a window for file loading, and one need to select the *out.json* file under this repo. The loading only takes once, and will not occur during the guessing.

To run the guessing for a second time, refresh the game status (by changing to *practice mode* and change back to *challenge mode*), then rerun the last line of the js code (e.g. *start_guess(all_d, num_d);*). There is no need to reload the functions or the json file.

### run.py

To manually play the game, one can run the python script run.py. The script contains an infinite loop of the following steps:

1. Enter *nk*, the number of clues provided (initially 7, reduces to 3 in the end). Press enter directly to use the default value between the parentheses.

2. Enter the character name of the first guess. The best option is given between the parentheses, and press enter directly to use it.

3. Enter the clues provided as a string of digits 0~6, e.g. 035, 1236. This step is skipped if all clues are provided (*nk*=7).

4. Enter the result of the guess. If the guess succeeded, press enter directly. Otherwise, input the result as a string of length *nk* (e.g. "xpxdoou"), where each char represents:
    - *o*: correct (green cell)
    - *p*: partially correct (yellow cell)
    - *d*: should be smaller (red cell with ↓)
    - *u*: should be larger (red cell with ↑)
    - *x*: wrong (other red cell)

5. Then the script will give the next best guess. In detail, there are several cases:
    - *"Success: please guess xxx"*: The answer is xxx and you can directly guess and succeed in the next round.
    - *"Success: please guess from: xxx yyy zzz"*: (Appears when all clues are correct, but the character is wrong) The answer lies in xxx, yyy, zzz, and the best way is to guess it one by one.
    - *"please guess xxx, remain: ..."*: The next best guess is xxx. For convenience, all possible answers are shown. Notice that xxx may not be in the possible answers, since sometimes using a wrong answer to distinguish the possible answers is optimal.

    For the first two cases, the program will jump back to step 1, and in the last case, the program will jump to step 4.