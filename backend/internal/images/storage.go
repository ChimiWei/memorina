package images

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// MinIOStorage stores files in a MinIO (S3-compatible) bucket
type MinIOStorage struct {
	Client *minio.Client
	Bucket string
}

// NewMinIOStorage initializes a MinIO client and ensures the bucket exists
func NewMinIOStorage(endpoint, accessKey, secretKey, bucket string, useSSL bool) (*MinIOStorage, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	ctx := context.Background()
	exists, err := client.BucketExists(ctx, bucket)
	if err != nil {
		return nil, fmt.Errorf("failed to check bucket %q: %w", bucket, err)
	}
	if !exists {
		if err := client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, fmt.Errorf("failed to create bucket %q: %w", bucket, err)
		}
	}

	return &MinIOStorage{Client: client, Bucket: bucket}, nil
}

// Upload stores an object in MinIO
func (ms *MinIOStorage) Upload(ctx context.Context, objectName string, data io.Reader, size int64, contentType string) error {
	_, err := ms.Client.PutObject(ctx, ms.Bucket, objectName, data, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("failed to upload object %q: %w", objectName, err)
	}
	return nil
}

// Delete removes an object from MinIO
func (ms *MinIOStorage) Delete(ctx context.Context, objectName string) error {
	err := ms.Client.RemoveObject(ctx, ms.Bucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete object %q: %w", objectName, err)
	}
	return nil
}

// GetURL generates a presigned URL for reading an object (valid for 24 hours)
func (ms *MinIOStorage) GetURL(ctx context.Context, objectName string) (string, error) {
	url, err := ms.Client.PresignedGetObject(ctx, ms.Bucket, objectName, 24*time.Hour, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL for %q: %w", objectName, err)
	}
	return url.String(), nil
}
