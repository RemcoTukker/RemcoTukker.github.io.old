# Evolution [TO BE COMPLETED - MAY CONTAIN ERRORS!]

During the history of life on Earth, evolution has proven itself to be a remarkably effective developer of intricate structures, complex processes and intelligent behavior. And all that just by exploiting random changes and procreation of existing organisms. No wonder, then, that many researchers of artificial intelligence have thought about the process and made attempts at replicating it in evolutionary algorithms. While these algorithms have proven themselves to be useful for a number of applications, their are certain limits as to what they are able to achieve.

In this essay, I will first give a short overview of evolutionary algorithms, then describe where these algorithms are falling short compared to natural evolution, and finally I will discuss some ways in which we may bring our algorithms to better results.

## Evolutionary Algorithms

While the process of evolution is rather straightforward, a number of different flavors of evolutionary algorithms developed for historical reasons. Here are the most important categories; note that in particular the first three categories are very similar:

### Genetic Algorithms
An array of bits is used as the unit that is evolved. Each generation, a lot of them are evaluated against a fitness (objective) function, and based on their score, a new generation is created using mutation, crossover, etc, of the bit arrays of the last generation.

### Evolution Strategies
A vector of real values is used as the unit that is evolved. Rest is pretty much the same, however, the use of real numbers makes it easier to apply some tricks like covariance matrix adaptation (CMA-ES), which is basically just a way of improving the search behavior by also learning relations between the different numbers in the vector (and thus can learn more about the structure of the fitness function than just the fitness at the current location in the fitness landscape).

### Evolutionary Programming
In evolutionary programming the parameters of a computer program are evolved. Those parameters can be anything, but will typically be numbers. The computer program is run with each set of parameters and the result of the computer program is used for creating the next generation.

### Genetic Programming
A computer program itself is evolved. The length of the computer program can vary. A generation is simply executed to evaluate its performance, after which the next generation can be build. Special care is taken to make sure the program terminates, mostly by evolving a program in a functional language (eg LISP). 

### Artificial Life
ALife is not really considered an evolutionary algorithm, but it is the next logical step after Genetic Programming. Artificial Life takes a broader view of evolution and simulates a whole environment in which organisms can live and, possibly, evolve. The organisms are typically a combination of a 'physical' representation in the simulation and a computer program as the 'mind' of the organism, which may both evolve.

## Shortcomings as compared to natural evolution

Evolutionary algorithms have the important advantage that they can be applied to almost any problem domain and make almost no assumptions on the problem description. The only thing that is necessary is to be able to give a score to an individual; note that this is possible even when having multiple objectives by using a Pareto front. Then why are EAs not used to solve all our engineering problems? The reason is that the algorithms do not scale very well with the size of the problem: as soon as there is more than a handful of parameters to optimize, it often just takes too long to evaluate all individuals in each generation. Because the algorithms make so little assumptions on what the problem looks like, it can not use any tricks to converge to a solution faster either! This is in particular painful for Genetic Programming and Artificial Life, as those allow greater flexibility in each individual.

.... What this really amounts to is that evolutionary algorithms cannot handle complexity; not that any other algorithms are better at that though. ....

Now, this is in stark contrast with natural evolution. In nature, even simple organisms can have huge genomes with billions of base pairs, while we can be happy if we get an evolutionary algorithms to solving an optimization problem with 1000 parameters. Life on Earth spread over countless niches, each with their own particulars, displaying a myriad of solutions to the question of staying alive. Of course, you'll have noticed the difference in time scale. Natural evolution has happened over billions of years, while we want to have results from our algorithms in a matter of weeks. Thus, this definetely puts a limit on what we can do. However, suppose we _did_ run our current algorithms for years and years? The result would in most cases not be much better than the result after some days. There's a number of reasons for that: evolutionary algorithms are usually run to convergence within those few days, convergence often happens in local maxima, the fitness function of more difficult problems may give good scores to undesirable solutions, and often certain maxima or niches are so unlikely to be reached that running for years does still not result in that solution being found. Now, how could we begin to fix those issues and reach results closer to natural evolution?


---
What we should realize is that we try to apply evolutionary algorithms to strictly defined optimization problems, while natural evolution operates in a completely different way. There _is_ no goal in nature, just as there is no real convergence either; instead, organisms in nature can be thought of as being in free but very slow fall towards minima in an always changing fitness landscape. Also note that organisms in nature occupy a certain niche: when there's a certain amount of organisms at a certain point in the fitness landscape, it prevents other species from entering this niche. Finally, note that this niche filling may be the primary reason for different species to exist; if a niche was big enough for everybody, 

Luckely, researchers have noted the importance of niches as well, and people have been imposing 'niche penalties' within their fitness evaluation. 
Also, in some evolutionary algorithms different 'species' are allowed to be in existence, eg by evolving solutions on different 'islands'.

This is one step, but we still have to make the other steps, namely defining a very open fitness landscape, having a very slow mutation rate, running the algorithm for a long time, don't allow convergence, possibly by having a changing fitness landscape (either by interaction of the solutions with the landscape as in ALife or forced), and finding an answer to the original problem by evaluating different 'species' and selecting one out of the 'zoo'. Its possible to then optimize those solutions further to a more strict fitness function.

Finally, as has been noted many times by researchers, there should be genotype / phenotype relation. This is important, because we want to evolve slowly, but still sometimes allow rather large steps in phenotype. .. Its an attempt at making useful large steps in phenotype at a higher probability than just doing a random large mutation... I guess? And, we want to allow to _reuse_ basic components of a phenotype!

## How to improve




## Interesting links

* [The Hitch-Hiker's Guide to Evolutionary Computation](http://www.cse.dmu.ac.uk/~rij/gafaq/top.htm)
* [Push](http://faculty.hampshire.edu/lspector/push.html): a language specifically designed for genetic programming (with a tree representation)
* [Slash/A](https://github.com/arturadib/Slash-A): a language specifically designed for linear genetic programming
