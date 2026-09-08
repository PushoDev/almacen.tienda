---
paths:
  - tests/Pest.php
---

# Tests

## Never let Pint rewrite the pest()->extend() line in tests/Pest.php to short class names
Pint's `fully_qualified_strict_types`/`ordered_imports` fixers will rewrite `pest()->extend(Tests\TestCase::class)->use(Illuminate\Foundation\Testing\RefreshDatabase::class)` into short class names (`TestCase::class`, `RefreshDatabase::class`) plus `use` imports placed further down the file. This breaks the test suite entirely with `Pest\Exceptions\TestCaseClassOrTraitNotFound: The class TestCase was not found` — Pest's own bootstrap appears to statically extract this call before the file's later `use` imports are in effect, unlike normal PHP compile-time `use` resolution.

Keep this line fully-qualified inline (no `use` alias for `Tests\TestCase` or `Illuminate\Foundation\Testing\RefreshDatabase`):
```php
pest()->extend(Tests\TestCase::class)
    ->use(Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->in('Feature');
```
After running `vendor/bin/pint --dirty` (or any Pint pass) touches this file, always re-check this specific line and restore the fully-qualified form if Pint reverted it, then re-run the suite before trusting it's green.
