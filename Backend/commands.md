python manage.py migrate
python manage.py setup_alert_schedules
celery -A config worker -l info
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler


celery -A config purge
      

  if options["clear"]:
            if not settings.DEBUG:
                raise CommandError("--clear refuses to run unless DEBUG=True. Point this at a dev/test DB only.")
            self.clear_data()
            self.stdout.write(self.style.SUCCESS("Cleared seedable tables."))
            return


curl -X POST https://fabulous-power-charcoal.ngrok-free.dev/api/v1/subscriptions/{id}/checkout/ \
  -H "Authorization: Bearer <token>" \
  -d '{"gateway": "MTN_MOMO", "phone_number": "237683691027"}'

curl -X POST https://fabulous-power-charcoal.ngrok-free.dev/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+237654599603",
    "password": "ntsemancho123"
  }'

curl -X POST https://fabulous-power-charcoal.ngrok-free.dev/api/v1/payments/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzg3MTA2NTU2LCJpYXQiOjE3ODcxMDI5NTYsImp0aSI6IjE1ZWU3NmI4ZDk1MjQxNTVhMjE1NmI5M2RjYmQ2NjJjIiwidXNlcl9pZCI6IjEiLCJwaG9uZV9udW1iZXIiOiIyMzc2NTQ1OTk2MDMifQ.ZCa1NJj21TM9m_dfVTxQjDlPY96Ladm5gpIZ3V5FrEI" \
  -H "Content-Type: application/json" \
  -d '{
    "order": "5407",
    "gateway": "MTN_MOMO",
    "phone_number": "+237683691027"
  }'

curl https://fabulous-power-charcoal.ngrok-free.dev/api/v1/payments/5410/ \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzg3MTA2NTU2LCJpYXQiOjE3ODcxMDI5NTYsImp0aSI6IjE1ZWU3NmI4ZDk1MjQxNTVhMjE1NmI5M2RjYmQ2NjJjIiwidXNlcl9pZCI6IjEiLCJwaG9uZV9udW1iZXIiOiIyMzc2NTQ1OTk2MDMifQ.ZCa1NJj21TM9m_dfVTxQjDlPY96Ladm5gpIZ3V5FrEI"


clone this repo into your sandbox
https://github.com/comanddragon/wedemboyz
how we ship changes is you send the new and edited files in a zip folder respecting their directories. and a commit message. apply the same commit in your sandboxed version.
as we work i'll notify you if i've made external changes then you'll just git pull.