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


Clone this repo into your sandbox: https://github.com/comanddragon/wedemboyz
Workflow: when you make edits, commit them in your sandbox with a proper commit message, then zip up the new/edited files (respecting their directory structure) and send me the zip so I can apply it on my end. If I make changes externally, I'll tell you to git pull to sync up.



if you need help ask questions to make sure you grasp what is required of you