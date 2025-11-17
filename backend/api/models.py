from django.db import models

class Channel(models.Model):
    name = models.CharField(max_length=100, unique=True)
    base_cpv = models.IntegerField()
    cpv_audience = models.IntegerField()
    cpv_non_target = models.IntegerField()

    def __str__(self):
        return self.name

class Bonus(models.Model):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='bonuses')
    bonus_type = models.CharField(max_length=100)
    condition_type = models.CharField(max_length=100)
    min_value = models.FloatField(default=0.0)
    rate = models.FloatField()
    description = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.channel.name} - {self.description}"

class Surcharge(models.Model):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name='surcharges')
    surcharge_type = models.CharField(max_length=100)
    condition_value = models.CharField(max_length=100)
    rate = models.FloatField()
    description = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.channel.name} - {self.description}"
