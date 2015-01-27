# Computer Go [TO BE COMPLETED - MAY CONTAIN ERRORS!]

The game of Go is in many ways the ultimate abstract strategy game: war is reduced to putting stones on a grid, one by one, with the purpose of capturing as much area as possible. The only basic rule is that you can capture the stones of the enemy by surrounding them, with a couple of additional rules to prevent unending loops in the game and to decide who is the winner of a game. These simple rules nevertheless lead to incredibly deep gameplay and one can easily spend a lifetime trying to become a better Go player, much like an art or a science. It also makes Go one of the few games<sup>1</sup> that humans are much better at than computers. I'll talk about how we may be able to change that situation.

## Why Is Go So Hard?

Simply put, it's the sheer number of possibilities at each stage of the game. The full board has 19x19 places to play, so at the very beginning of the game, you already have 361 options. But of course, you have to take into account the stone that the opponent will play in response, and your response to it, etc, etc, to find out whether your opening will lead you to victory or not. As you don't know which stone the opponent will play, you end up with a giant search problem which is simply impossible to solve. Thus, somehow, a player has to evaluate a lot of possible moves and pick the best one, without having to predict the whole game that will follow after each possible move. Only a couple of the best looking possibilities can be evaluated further, to find out whether it doesn't lead you straight into a trap on the long term, for example. Finding out which moves "look good" and which ones are certainly bad is exactly something a computer is not particularly good at. 

Nevertheless, I don't see a good theoretical reason for computers to be bad at Go. If humans can find out which moves look good, computers should be able to do the same as long as they are programmed properly. After all, a current desktop computer can beat the best human Chess players, and it would be hard to argue that Go requires a lot more brain activity than Chess. It's just that it turned out to be easier to write algorithms for the kind of thinking that is involved in Chess<sup>2</sup>. Thus, I believe that with the right algorithms, a computer should be able to beat a human easily, thanks to its raw speed.

 

## Historical and Current Approaches

At the moment, Go playing programs can compete (not always win) with good amateurs without requiring handicaps<sup>3</sup>, which is already a great accomplishment. Broadly speaking, there's two strategies these programs take:

* Pattern Recognition:

* Monte Carlo search:

## The Missing Link?

I think what's missing from these strategies that could improve Go programs is simply a better way of storing and utilizing knowledge about the game. Thus, I will mainly discuss improvements on the Pattern Recognition strategy. Search and Monte Carlo algorithms are also very important, but I believe there's not much to gain in those areas anymore. 


We can distinguish between three catogeries of knowledge:

* Knowledge that has accumulated over the history of the game: standard openings, proverbs, trick plays, etc. This has typically been the knowledge that has been painstakingly introduced into computer Go by programming it as huge sets of heuristics. 
* Knowledge that a player accumulates over his lifetime: professional Go players review a lot of games and can often remember their (and other people's) games move by move. This allows them to see parallels between games, or simply to know the result of a particular move. In computer Go, something like this knowledge is sometimes extracted from game databases. Note that this type of knowledge will generally include the knowledge that has been gathered over the history of the game, because even if you didn't know about, the way your opponents play will reflect this knowledge.
* Knowledge about the current game from earlier moves: a player will remember how important a particular group of stones is at the board, how many stones are needed to kill a group from the opponent, etc. A search algorithm can for example remember all or part of the results of the search from previous turns.

The third type of knowledge is rather straightforward to implement and I expect any top Go program to have ways of reducing their workload by remembering properties of the stones at the board or of the game in general. If one would want to make small improvements to Go programs quickly, that is probably the place to search. However, the second type of knowledge is where we have to look if we want to make the computer better at playing Go than humans. We have to build a Go playing program that can remember and learn from it's own games! 






If you have read Jeff Hawkins' book [On Intelligence](link to my other page), you already know that humans often do a lot more memorization than computation. I think Go is a prime example of that rule: Go playing programs have to calculate results for a move continuously, while humans just _know_ what is a good move or a bad move. And they know, because they remembered the move sequences from earlier similar situations. Computer Go programs do remember some things: they use databases with trick plays, openings, etc. There's two ways in which we can improve such databases: firstly, they must be specifically adapted for use with move sequences, and secondly, they should be much bigger. Databases currently in use are at most a couple of GB, while we can easily build a database in the TB range nowadays (even when we want the whole thing to be on SSD; not cheap, but still off-the-shelf).

TODO: see if we can say something about how much this is expected to help. 

## Practical Issues


## Footnotes

<sup>1</sup> Other games in which humans can easily beat computers are [Arimaa](http://en.wikipedia.org/wiki/Arimaa), which was specifically designed to be hard for computers, and [Havannah](http://en.wikipedia.org/wiki/Havannah). See [Sensei's Library](http://senseis.xmp.net/?OtherGamesConsideredUnprogrammable) for more games and thoughts.

<sup>2</sup> This argument is not completely solid: it may be that human brains are much less efficient when applied to Chess than when applied to Go. However, both games are very abstract and I don't think that it could explain a difference of a couple of orders of magnitude (even with a supercomputer you still cannot beat a Go professional).

<sup>3</sup> A handicap in Go is given simply by giving one of the players a couple of stones to place at the board before the start of the game.

## Links

[Sensei's Library](http://senseis.xmp.net/) Everything you'll ever want to know about Go, including computer Go [here](http://senseis.xmp.net/?ComputerGo) and [here](http://senseis.xmp.net/?ComputerGoProgramming) and [here](http://senseis.xmp.net/?ComputerGoAlgorithms).
[Zen](http://soft.mycom.co.jp/pcigo/tencho3/index.html) Currently the best Go playing program. Japanese website though :-(
[Crazy Stone](http://remi.coulom.free.fr/CrazyStone/) One of the leading Go playing programs.
[Fuego](http://fuego.sourceforge.net/) One of the previous generation of top Go playing programs. Open source, C++!
[Pachi](http://pachi.or.cz/) One of the previous generation of top Go playing programs (no MC). Open source, C++!
[Tesuji Go Library](http://sourceforge.net/projects/tesujigolibrary/) Java library with Go code.
[Oakfoam](http://oakfoam.com/) New Go playing program that uses MC search.
[GnuGo](http://www.gnu.org/software/gnugo/gnugo.html) Open source Go playing program. Not particularly strong, but parts of the program can be reused.
[Go Text Protocol](http://www.lysator.liu.se/~gunnar/gtp/) A protocol that can be used to talk to Go servers.

