# Archi:

```javascript

flowchart TD
    A[Telegram Listener] --> B[BullMQ Queue]
    B --> C[Telegram Worker]
    C --> D[AIService]
    D --> E[AI Classifier]
    E --> F[OllamaService]
    F --> G[Tev1 0.8B]
    D --> H{Is job posting?}
    H -->|No| I[Skip or record result]
    H -->|Yes| J[Job Extraction Service]
    J --> F
    F --> K[Qwen 3B]
    K --> L[Zod Validation]
    L --> M[JobService]
    M --> N[(MongoDB)]

```