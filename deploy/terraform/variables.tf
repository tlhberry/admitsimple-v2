variable "client_name" {
  description = "Short name for this client (e.g. sunrise-recovery). Used in resource names."
  type        = string
}

variable "domain" {
  description = "Full domain for this client (e.g. sunrise.admitsimple.com or app.sunriserecovery.com)"
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "admin_password" {
  description = "Initial admin password for this client's AdmitSimple"
  type        = string
  sensitive   = true
}

variable "session_secret" {
  description = "Random string for session encryption (min 32 chars)"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
}

variable "twilio_account_sid" {
  description = "Twilio Account SID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "twilio_auth_token" {
  description = "Twilio Auth Token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "twilio_phone_number" {
  description = "Twilio phone number (e.g. +16025551234)"
  type        = string
  default     = ""
}

variable "twilio_twiml_app_sid" {
  description = "Twilio TwiML App SID"
  type        = string
  default     = ""
}

variable "anthropic_base_url" {
  description = "Anthropic API base URL"
  type        = string
  default     = ""
}

variable "anthropic_api_key" {
  description = "Anthropic API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "ecr_repository_url" {
  description = "ECR repository URL for Docker images"
  type        = string
}

variable "image_tag" {
  description = "Docker image tag to deploy"
  type        = string
  default     = "latest"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "ecs_cpu" {
  description = "ECS task CPU units (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "ecs_memory" {
  description = "ECS task memory in MB"
  type        = number
  default     = 1024
}
