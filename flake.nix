{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    utils.url = "github:numtide/flake-utils";
  };
  outputs = { self, nixpkgs, utils }: utils.lib.eachDefaultSystem (system:
    let
      pkgs = nixpkgs.legacyPackages.${system};
      
      mkExtension = name: outputFile: pkgs.stdenvNoCC.mkDerivation {
        inherit name;
        src = ./.;
        
        nativeBuildInputs = [ pkgs.zip ];
        
        buildPhase = ''
          export HOME=$TMPDIR
          bash pack.sh
        '';
        
        installPhase = ''
          mkdir -p $out
          cp ${outputFile} $out/
        '';
      };

      # Playwright test package
      playwright-test = pkgs.writeShellApplication {
        name = "playwright-test";
        runtimeInputs = with pkgs; [ 
          nodejs 
          playwright-driver
          chromium
          firefox
        ];
        text = ''
          export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
          export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
          
          cd tests
          
          # Install dependencies if needed
          if [ ! -d "node_modules" ]; then
            echo "Installing npm dependencies..."
            npm install
          fi
          
          # Run tests
          echo "Running Playwright tests..."
          npx playwright test "$@"
        '';
      };
    in
      {
        packages = {
          chrome = mkExtension "nykredit-extension-chrome" "chrome.zip";
          firefox = mkExtension "nykredit-extension-firefox" "firefox.xpi";
          default = self.packages.${system}.firefox;
          playwright-test = playwright-test;
        };
        
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            zip
            nodejs
            playwright-driver
            chromium
            firefox
          ];
          
          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            
            echo "Nykredit Extension Development Environment"
            echo ""
            echo "Available commands:"
            echo "  nix build .#chrome        - Build Chrome extension"
            echo "  nix build .#firefox       - Build Firefox extension"
            echo "  nix run .#playwright-test - Run Playwright tests"
            echo ""
            echo "Manual test commands:"
            echo "  cd tests && npm install   - Install test dependencies"
            echo "  cd tests && npm test      - Run tests"
          '';
        };
      }
  );
}
