# Graphify operating model

## Role of the graph

`graphify-out/graph.json` is a routing index and hypothesis map. It narrows a repository question to
relevant concepts, files and paths; it is not the final authority for consequential claims.

The authority remains the cited source:

- code and tests for implementation behavior;
- current wiki/specification pages for business rules and decisions;
- runtime, deployment, endpoint or database evidence for operational state.

## Default workflow

For every concrete repository query or implementation task:

1. Start with `graphify query`, `graphify path` or `graphify explain`.
2. Read the cited source files and verify claims that affect the task or decision.
3. Check live evidence when the claim concerns production, deployment, Soft1 or configuration.
4. Complete the task using the verified facts.
5. If the task establishes a stable fact, update its canonical wiki/specification/source page.
6. Run `graphify --update` after relevant source changes.
7. Validate graph health, provenance and retrieval before accepting the updated artifact.

This is just-in-time validation: frequently used areas become highly trusted through real work,
without spending time on a one-off audit of every graph node.

## Wiki and Graphify

The wiki and Graphify form one feedback loop:

1. The wiki records curated current truth and the reasoning behind decisions.
2. Graphify indexes the wiki together with code, tests and other documentation.
3. A concrete task queries the graph, then verifies important claims in their sources.
4. A stable new discovery updates the wiki or other canonical source first.
5. `graphify --update` incorporates that source change into the navigable graph.

The wiki is therefore the durable knowledge layer; Graphify is the navigation and relationship
layer. Neither replaces source verification for consequential or operational claims.

## Trust policy

- AST relationships (`imports`, `calls`, classes and methods): high trust; inspect when surprising.
- Semantic `EXTRACTED` with a source location: spot-check the cited location.
- Semantic `INFERRED`: verify before using it for a decision.
- Nodes marked `_unverified`: never treat as evidence until confirmed in the source.
- Production or deployment state: repository text alone is insufficient; verify live evidence when
  the task depends on it.

## Update policy

Do not repair facts by hand-editing `graphify-out/graph.json`. Correct the canonical source or the
extraction rule, then update the graph.

The graph refined on 2026-08-24 preserves directed relations, source provenance, import-reference
nodes and evidence for parallel relations. A blind full rebuild may discard those properties. After
any update or rebuild, confirm at minimum:

- detected semantic coverage, with intentional secret exclusions stated explicitly;
- zero dangling or missing endpoints;
- zero directed edge-collapse candidates;
- portable source paths and retained source locations;
- current-fact queries return current operational nodes before historical proposals;
- the replacement graph is not unexpectedly smaller.
