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

      # Playwright test package - uses Nix-managed playwright, no npm
      playwright-test = pkgs.writeShellApplication {
        name = "playwright-test";
        runtimeInputs = with pkgs; [ 
          playwright-driver
        ];
        text = ''
          export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
          export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
          
          cd tests
          
          # Run tests using Nix-managed playwright
          echo "Running Playwright tests..."
          playwright test "$@"
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
            playwright-driver
          ];
          
          shellHook = ''
            echo "Nykredit Extension Development Environment"
            echo ""
            echo "Available commands:"
            echo "  nix build .#chrome        - Build Chrome extension"
            echo "  nix build .#firefox       - Build Firefox extension"
            echo "  nix run .#playwright-test - Run Playwright tests"
            echo ""
            echo "Test commands:"
            echo "  cd tests && playwright test       - Run all tests"
            echo "  cd tests && playwright test --project=chrome  - Chrome only"
            echo "  cd tests && playwright test --project=firefox - Firefox only"
          '';
        };
      }
  );
}
