"""Conservative training-time augmentation only.

Do not write augmented copies into val/ or test/.
Do not persist augmented images into Skin_Risk_Dataset_V4.
"""

from __future__ import annotations

TRAIN_AUGMENTATION_NOTES = """
Safe training-time augmentation (TRAIN ONLY)
--------------------------------------------
Use these transforms in the training dataloader. Never apply them to
validation or test images, and never save the results back into the
dataset folders.

Recommended conservative transforms:
  - Horizontal flip (p=0.5), unless laterality is clinically meaningful
  - Rotation in [-10, +10] degrees
  - Scale / zoom in [0.90, 1.10]
  - Translation up to 5% of width/height
  - Brightness and contrast jitter of about ±10%

Avoid:
  - Vertical flips for most body-site photos
  - Heavy elastic / grid distortion
  - Aggressive color shifts or channel shuffle
  - Cutout / random erasing over the lesion
  - Mixup / CutMix across different risk labels
  - Any augmentation of val or test

Do not balance classes by writing duplicate files. Use class weights
or a weighted sampler instead.
"""


def torchvision_train_transforms():
    from torchvision import transforms

    return transforms.Compose(
        [
            transforms.Resize((256, 256)),
            transforms.RandomResizedCrop(224, scale=(0.90, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomAffine(degrees=10, translate=(0.05, 0.05), scale=(0.90, 1.10)),
            transforms.ColorJitter(brightness=0.10, contrast=0.10),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )


def torchvision_eval_transforms():
    from torchvision import transforms

    return transforms.Compose(
        [
            transforms.Resize((256, 256)),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )


def print_recommendations() -> None:
    print(TRAIN_AUGMENTATION_NOTES)
    print("Torchvision helpers: torchvision_train_transforms() / torchvision_eval_transforms()")
    print("Full training script: train_v4.py")
