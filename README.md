# Setup Helmfile

GitHub Action for installing and initializing Helmfile.

## Features

- Installs Helmfile on the host
- Supports installing a specific version of Helmfile
- Automatically install additional tools needed by Helmfile like Helm and Helm
  plugins

## Usage

```yaml
- uses: heypigeonhq/setup-helmfile@v1.0.0

  with:
    # When "true", skip Helmfile initialization. Defaults to "false".
    skip-init: ""

    # Version of Helmfile to install. Only supports exact versions and "latest".
    # Defaults to "latest".
    # Example: "0.156.0"
    version: ""
```
