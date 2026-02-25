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
      run-tests = pkgs.writeShellApplication {
        name = "run-tests";
        runtimeInputs = with pkgs; [ 
          playwright-test  # Provides the 'playwright' command
        ];
        text = ''
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
            echo "  nix run .#run-tests                    - Run all tests"
            echo "  nix run .#run-tests -- --project=chrome  - Chrome only"
            echo "  nix run .#run-tests -- --project=firefox - Firefox only"
          '';
        };
      }
  );
}
