terraform {
  required_providers {
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

# Configures the provider to use the resource block's specified project for quota checks.
provider "google-beta" {
  user_project_override = true
  credentials = var.service_account_key
}

provider "github" {
  token = var.github_token  # create this variable securely
  owner = var.github_owner  # e.g. your username or organization
}