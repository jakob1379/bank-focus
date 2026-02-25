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

      # Playwright test package - uses Nix-managed playwright
      run-tests = pkgs.writeShellApplication {
        name = "run-tests";
        runtimeInputs = with pkgs; [ 
          playwright-test
        ];
        text = ''
          # Setup extension files first
          bash setup-tests.sh
          
          # Run tests from tests directory
          cd tests
          
          # Set Playwright to use Nix-managed browsers
          export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
          export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
          
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
          run-tests = run-tests;
        };
        
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            zip
            playwright-test
          ];
          
          shellHook = ''
            echo "Nykredit Extension Development Environment"
            echo ""
            echo "Available commands:"
            echo "  nix build .#chrome        - Build Chrome extension"
            echo "  nix build .#firefox       - Build Firefox extension"
            echo "  nix run .#run-tests       - Run Playwright tests"
            echo ""
            echo "Test commands:"
            echo "  nix run .#run-tests                      - Run all tests (headless)"
            echo "  HEADLESS=false nix run .#run-tests       - Run tests in headed mode"
            echo "  nix run .#run-tests -- --project=chromium - Chromium only"
            echo "  nix run .#run-tests -- --project=firefox  - Firefox only"
          '';
        };
      }
  );
}
