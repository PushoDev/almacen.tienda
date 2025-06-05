<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Pivot;

class UserAlmacen extends Pivot
{
    /**
     * Undocumented variable
     * ✅ Sin ID autoincremental
     * @var boolean
     */
    public $incrementing = false;
}
