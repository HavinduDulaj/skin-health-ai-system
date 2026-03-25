import tensorflow as tf

train_path = "../dataset/train"
val_path = "../dataset/val"

train_ds = tf.keras.preprocessing.image_dataset_from_directory(
    train_path,
    image_size=(224, 224),
    batch_size=8
)

val_ds = tf.keras.preprocessing.image_dataset_from_directory(
    val_path,
    image_size=(224, 224),
    batch_size=8
)

print("Classes:", train_ds.class_names)

for images, labels in train_ds.take(1):
    print("Images shape:", images.shape)
    print("Labels shape:", labels.shape)