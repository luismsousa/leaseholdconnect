# TODO List

* add additional functionality to meetings
* add tests

## Data arch refactor prompt

Let's rethink the data model, here are some functional considerations:

* an association is made up of the leaseholders of a development (large associations)  or a building (smaller associations)
* Leaseholders usually own one plot but can own more. (I believe this is already implemented)
* the quantity of voting shares is defined by the number of plots represented in an association (I believe this is already implemented)
  * A leaseholder has the number of votes equal to the number of plots that they own. (I believe this is already implemented)
* A resident can live in a leasehold plot but does not automatically get voting rights.
* A resident only has voting rights if the leaseholder delegates said plot's voting rights to the leaseholder.
* An association can decide (via their admins) what happens to the voting rights of unclaimed plots (for example, they don't count for voting purposes or they count but they don't count for a threshold of votes to be approved).
Can you create a diagram of the current data architecture and of the modified data architecture based on these statements?
@schema.ts 
We don't have any live users in the production convex environment, so can we wipe the database and remove the need for migrations
can you record the new target data architecture and plan out the tasks to begin implementing the relevant api and ui changes?
