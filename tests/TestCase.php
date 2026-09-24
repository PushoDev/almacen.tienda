<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Los tests no dependen del frontend compilado: sin esto, cualquier página Inertia falla con
     * ViteManifestNotFoundException cuando no existe public/build/manifest.json (servidor de
     * desarrollo apagado o build sin generar).
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }
}
