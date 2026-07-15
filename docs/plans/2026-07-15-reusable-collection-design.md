# Reusable collection design

## Decision

Pages may include an explicit `reusable_collection` block. The immutable page snapshot stores the editorial placement, heading, one reusable entry type and an ordered list of entry keys. It does not copy mutable reusable content.

## Resolution

The public repository collects every reusable reference in a validated published page, reads only rows with `status = 'published'`, validates each row against its discriminated content schema, and returns entries in the reference order. Missing, unpublished, mismatched or invalid rows are omitted. A collection with no resolved entries renders nothing.

## Rendering

The existing public page renderer receives the resolved collection data. Each supported entry type has a constrained presentation using the current editorial typography, spacing, cards and disclosure patterns. React continues to escape every value and links use the shared safe CMS contract.

## Editing and publication

The section editor provides schema-aware controls for the reusable type and ordered keys. PostgreSQL validates the complete block shape at direct draft writes and page publication. Publishing or unpublishing a reusable entry changes whether an existing page reference resolves, without mutating the page version.

## Failure handling

Invalid page snapshots fail safely as missing public content. Invalid reusable rows and unavailable reusable queries never expose draft content or crash the page. Tests cover schema parity, publication filtering, ordering and empty resolution.
