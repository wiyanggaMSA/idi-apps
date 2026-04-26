<?php

namespace App\Services\Secretariat;

use RuntimeException;

class LetterWorkflowException extends RuntimeException
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
