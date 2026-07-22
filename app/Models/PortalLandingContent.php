<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PortalLandingContent extends Model
{
    use HasFactory, SoftDeletes;

    public const SECTION_SLIDER = 'slider';

    public const SECTION_ABOUT = 'about';

    public const SECTION_VISION_MISSION = 'vision_mission';

    public const SECTION_SERVICE = 'service';

    public const SECTION_LEADER = 'leader';

    public const SECTION_CONTACT = 'contact';

    public const SECTIONS = [
        self::SECTION_SLIDER,
        self::SECTION_ABOUT,
        self::SECTION_VISION_MISSION,
        self::SECTION_SERVICE,
        self::SECTION_LEADER,
        self::SECTION_CONTACT,
    ];

    protected $fillable = [
        'section',
        'title',
        'subtitle',
        'content',
        'image_path',
        'items',
        'meta',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'items' => 'array',
        'meta' => 'array',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}
