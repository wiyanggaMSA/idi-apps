<?php

namespace App\Services\Organization;

use RuntimeException;

class OrganizationDomainException extends RuntimeException
{
    public function __construct(
        private readonly string $field,
        string $message,
        int $code = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }

    public function field(): string
    {
        return $this->field;
    }
}
