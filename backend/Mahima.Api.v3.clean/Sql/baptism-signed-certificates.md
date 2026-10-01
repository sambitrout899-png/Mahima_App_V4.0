# Signed baptism certificate attachments

The baptism page offers **Attach Signed Certificate** on each record, including completed records. Select a PDF, JPG, or PNG up to 10 MB and upload it. Uploaded filenames appear beneath the candidate and download when selected. Multiple attachments are supported. Uploading does not alter workflow status or the generated certificate.

Metadata uses the existing `Attachments` table with owner type `baptism-signed-certificate`; no schema migration is required. Upload and download endpoints require the existing baptism authentication. Deleting a baptism also deletes its attachment metadata and attempts to remove its stored files.

Files default to `App_Data/baptism-signed-certificates` beneath the API content root, outside `wwwroot`. For deployment, configure `BaptismCertificates:Root` (environment variable `BaptismCertificates__Root`) to an absolute, private, persistent directory writable by the API process. Back up this directory together with the database and preserve it across deployments. Do not expose it through static-file middleware.

API routes:

- `POST /api/baptisms/{id}/signed-certificates`: multipart form field `file`.
- `GET /api/baptisms/{id}/signed-certificates/{attachmentId}`: authenticated file download scoped to the baptism record.
- Baptism list and detail responses include `signedCertificates` metadata.
