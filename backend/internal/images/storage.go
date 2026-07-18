package images

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// GarageStorage stores files in a Garage S3 bucket
type GarageStorage struct {
	Client *minio.Client
	Bucket string
}

// NewGarageStorage initializes a Garage S3 client and ensures the bucket exists
func NewGarageStorage(endpoint, accessKey, secretKey, bucket string, useSSL bool) (*GarageStorage, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:        credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure:       useSSL,
		BucketLookup: minio.BucketLookupPath, // Force path-style lookup for Garage compatibility
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Garage S3 client: %w", err)
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

	return &GarageStorage{Client: client, Bucket: bucket}, nil
}

// Upload stores an object in Garage
func (gs *GarageStorage) Upload(ctx context.Context, objectName string, data io.Reader, size int64, contentType string) error {
	_, err := gs.Client.PutObject(ctx, gs.Bucket, objectName, data, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("failed to upload object %q: %w", objectName, err)
	}
	return nil
}

// Delete removes an object from Garage
func (gs *GarageStorage) Delete(ctx context.Context, objectName string) error {
	err := gs.Client.RemoveObject(ctx, gs.Bucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to delete object %q: %w", objectName, err)
	}
	return nil
}

// GetURL generates a presigned URL for reading an object (valid for 24 hours)
func (gs *GarageStorage) GetURL(ctx context.Context, objectName string) (string, error) {
	url, err := gs.Client.PresignedGetObject(ctx, gs.Bucket, objectName, 24*time.Hour, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL for %q: %w", objectName, err)
	}
	return url.String(), nil
}

func (gs *GarageStorage) GetObject(ctx context.Context, objectName string) (*minio.Object, error) {
	object, err := gs.Client.GetObject(ctx, gs.Bucket, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get object %q: %w", objectName, err)
	}
	return object, nil
}