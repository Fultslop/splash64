# FS Project
============

## Context 
==========

You work on a windows platform. The commands you use must be windows compatible. 

## Project
==========

Keep an overview of development practises in this document.

[Project high level goals](../project/high_level_goals.md)

We will develop this incrementally, meaning the requirements are loosely defined and will get better defined over time as we discover the properties of the features.

Because this is a dsicovery project, code clarity and best JS code practises are important. Re-use code as much as you can, be on the lookout for generalizations and architecture improvements.

Keep a log in [devlog.md](./devlog.md), update after each signifant work item.

Keep a list of important domain entities in [domain_entities.md](./domain_entities.md)

## Pipeline 

The pipeline should be structured as:

load page -> choose demo/splash -> generate assets -> present

## Project organization

Keep code in src and keep a directory for each specific demo eg `./src/demo/cube` and shared/common code in `./src/common/` eg `./src/common/rendering`
