output "app_url" {
  description = "The live URL for this client's AdmitSimple"
  value       = "https://${var.domain}"
}

output "alb_dns_name" {
  description = "Point your domain's CNAME to this value in DNS"
  value       = aws_lb.main.dns_name
}

output "db_endpoint" {
  description = "RDS endpoint (private, not publicly accessible)"
  value       = aws_db_instance.postgres.address
  sensitive   = true
}

output "certificate_validation_records" {
  description = "Add these DNS records to validate your SSL certificate"
  value = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.ecs.name
}
